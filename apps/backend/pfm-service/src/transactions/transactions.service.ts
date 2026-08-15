import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TransactionEntity } from '../database/entities/transaction.entity';
import { AccountEntity } from '../database/entities/account.entity';
import { BudgetEntity } from '../database/entities/budget.entity';
import { CreditCardEntity } from '../database/entities/credit-card.entity';
import { CardMatrixService } from '../cards/card-matrix.service';
import {
  TransactionType,
  TransactionStatus,
  CurrencyCode,
  CardRecommendation,
} from '@wertbot/shared-types';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,

    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,

    @InjectRepository(BudgetEntity)
    private readonly budgetRepo: Repository<BudgetEntity>,

    @InjectRepository(CreditCardEntity)
    private readonly creditCardRepo: Repository<CreditCardEntity>,

    private readonly cardMatrixService: CardMatrixService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Transaction CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async getTransaction(id: string, userId: string): Promise<TransactionEntity> {
    const txn = await this.transactionRepo.findOne({ where: { id, userId } });
    if (!txn) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return txn;
  }

  async listTransactions(filter: {
    userId: string;
    accountId?: string;
    page?: number;
    limit?: number;
    fromDate?: number;
    toDate?: number;
    category?: string;
  }): Promise<{ transactions: TransactionEntity[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { userId: filter.userId };

    if (filter.accountId) {
      query.accountId = filter.accountId;
    }
    if (filter.category) {
      query.category = filter.category;
    }

    if (filter.fromDate && filter.toDate) {
      query.transactionDate = Between(new Date(filter.fromDate), new Date(filter.toDate));
    } else if (filter.fromDate) {
      query.transactionDate = MoreThanOrEqual(new Date(filter.fromDate));
    } else if (filter.toDate) {
      query.transactionDate = LessThanOrEqual(new Date(filter.toDate));
    }

    const [transactions, total] = await this.transactionRepo.findAndCount({
      where: query,
      order: { transactionDate: 'DESC' },
      skip,
      take: limit,
    });

    return { transactions, total };
  }

  async createTransaction(dto: {
    userId: string;
    accountId: string;
    transactionType: TransactionType;
    amountMinor: number;
    currency: CurrencyCode;
    merchantName?: string;
    merchantMcc?: string;
    source?: string;
    transactionDate?: number;
  }): Promise<TransactionEntity> {
    // 1. Verify account exists
    const account = await this.accountRepo.findOne({
      where: { id: dto.accountId, userId: dto.userId },
    });
    if (!account) {
      throw new NotFoundException(`Account ${dto.accountId} not found`);
    }

    // 2. Adjust balance
    const amount = Number(dto.amountMinor);
    const balanceBefore = Number(account.balanceMinor);
    
    if (dto.transactionType === TransactionType.DEBIT) {
      account.balanceMinor = balanceBefore - amount;
      account.availableMinor = Number(account.availableMinor) - amount;
    } else if (dto.transactionType === TransactionType.CREDIT) {
      account.balanceMinor = balanceBefore + amount;
      account.availableMinor = Number(account.availableMinor) + amount;
    }
    await this.accountRepo.save(account);

    // 3. Create Transaction
    const transaction = this.transactionRepo.create({
      userId: dto.userId,
      accountId: dto.accountId,
      transactionType: dto.transactionType,
      status: TransactionStatus.POSTED,
      amountMinor: amount,
      currency: dto.currency,
      merchantName: dto.merchantName || null,
      merchantMcc: dto.merchantMcc || null,
      source: dto.source || 'manual',
      transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
      aiMetadata: {},
    });

    // 4. Run Card Recommendation & Budget update triggers async or inline
    if (dto.merchantMcc) {
      try {
        const bestCard = await this.getCardRecommendation(dto.userId, dto.merchantMcc, amount, dto.currency);
        if (bestCard) {
          transaction.aiMetadata = {
            card_recommendation: bestCard.cardName,
            card_issuer: bestCard.issuer,
            reward_rate: bestCard.rewardRate,
            reasoning: bestCard.reasoning,
          };
        }
      } catch (err) {
        this.logger.error(`Failed to generate card recommendation: ${(err as any).message}`);
      }
    }

    const savedTxn = await this.transactionRepo.save(transaction);
    this.logger.log(`Transaction created: ${savedTxn.id} for user ${dto.userId}`);
    return savedTxn;
  }

  async updateTransactionStatus(id: string, status: TransactionStatus): Promise<TransactionEntity> {
    const txn = await this.transactionRepo.findOne({ where: { id } });
    if (!txn) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    txn.status = status;
    return this.transactionRepo.save(txn);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Budget Status & Alerts
  // ─────────────────────────────────────────────────────────────────────────

  async getBudgetStatus(
    userId: string,
    category: string,
    period = 'monthly',
  ): Promise<{
    category: string;
    limitMinor: number;
    spentMinor: number;
    spentPercent: number;
    isOverBudget: boolean;
    alertTriggered: boolean;
    aiSuggestion: string;
  }> {
    // Find active budget for category
    const budget = await this.budgetRepo.findOne({
      where: { userId, category, period, isActive: true },
    });

    if (!budget) {
      return {
        category,
        limitMinor: 0,
        spentMinor: 0,
        spentPercent: 0,
        isOverBudget: false,
        alertTriggered: false,
        aiSuggestion: 'No budget set for this category.',
      };
    }

    // Calculate sum of debit transactions in this category for this month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const txns = await this.transactionRepo.find({
      where: {
        userId,
        category,
        transactionType: TransactionType.DEBIT,
        transactionDate: Between(startOfMonth, endOfMonth),
      },
    });

    const spentMinor = txns.reduce((sum, t) => sum + Number(t.amountMinor), 0);
    const limitMinor = Number(budget.amountMinor);
    const spentPercent = limitMinor > 0 ? (spentMinor / limitMinor) * 100 : 0;
    const isOverBudget = spentMinor > limitMinor;
    const alertTriggered = spentPercent >= Number(budget.alertThreshold);

    let aiSuggestion = 'You are within your budget limits.';
    if (isOverBudget) {
      aiSuggestion = `Warning: You have exceeded your ${category} budget by $${((spentMinor - limitMinor) / 100).toFixed(2)}. Suggest reducing discretionary purchases.`;
    } else if (alertTriggered) {
      aiSuggestion = `Caution: You have utilized ${spentPercent.toFixed(1)}% of your ${category} budget. Remaining: $${((limitMinor - spentMinor) / 100).toFixed(2)}.`;
    }

    return {
      category,
      limitMinor,
      spentMinor,
      spentPercent,
      isOverBudget,
      alertTriggered,
      aiSuggestion,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Card Optimizer Integration
  // ─────────────────────────────────────────────────────────────────────────

  async getCardRecommendation(
    userId: string,
    merchantMcc: string,
    amountMinor: number,
    currency: CurrencyCode,
  ): Promise<CardRecommendation | null> {
    const userCards = await this.creditCardRepo.find({ where: { userId, isActive: true } });
    if (!userCards || userCards.length === 0) return null;

    // Convert entities to match CreditCard shared interface
    const cards = userCards.map(c => ({
      id: c.id,
      userId: c.userId,
      cardName: c.cardName,
      issuer: c.issuer || 'unknown',
      cardNetwork: c.cardNetwork,
      lastFour: c.lastFour || undefined,
      rewardCategories: c.rewardCategories,
      mccMultipliers: c.mccMultipliers,
      annualFeeMinor: c.annualFeeMinor,
      isActive: c.isActive,
      isPrimary: false, // default or fetch
    }));

    return this.cardMatrixService.getRecommendation(cards, merchantMcc, 'Merchant', amountMinor);
  }
}
