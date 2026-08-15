import { Controller, UseFilters } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { TransactionsService } from './transactions.service';
import { TransactionEntity } from '../database/entities/transaction.entity';
import {
  TransactionType,
  TransactionStatus,
  CurrencyCode,
} from '@wertbot/shared-types';

// =============================================================================
// WertBot — Transaction gRPC Controller
// Implements the gRPC service contract for internal microservice calls
// =============================================================================

@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @GrpcMethod('TransactionService', 'GetTransaction')
  async getTransaction(data: { transactionId: string; userId: string }) {
    const txn = await this.transactionsService.getTransaction(data.transactionId, data.userId);
    return this.mapTxnResponse(txn);
  }

  @GrpcMethod('TransactionService', 'ListTransactions')
  async listTransactions(data: {
    userId: string;
    accountId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    fromDate?: string;
    toDate?: string;
    category?: string;
  }) {
    const { transactions, total } = await this.transactionsService.listTransactions({
      userId: data.userId,
      accountId: data.accountId,
      page: data.page,
      limit: data.limit,
      fromDate: data.fromDate ? Number(data.fromDate) : undefined,
      toDate: data.toDate ? Number(data.toDate) : undefined,
      category: data.category,
    });

    const limit = data.limit || 20;
    const page = data.page || 1;
    const hasNext = page * limit < total;

    return {
      transactions: transactions.map(t => this.mapTxnResponse(t)),
      total,
      hasNext,
    };
  }

  @GrpcMethod('TransactionService', 'CreateTransaction')
  async createTransaction(data: {
    userId: string;
    accountId: string;
    type: string;
    amountMinor: string;
    currency: string;
    merchantName?: string;
    merchantMcc?: string;
    source?: string;
    transactionDate?: string;
  }) {
    const txn = await this.transactionsService.createTransaction({
      userId: data.userId,
      accountId: data.accountId,
      transactionType: data.type as TransactionType,
      amountMinor: Number(data.amountMinor),
      currency: data.currency as CurrencyCode,
      merchantName: data.merchantName,
      merchantMcc: data.merchantMcc,
      source: data.source,
      transactionDate: data.transactionDate ? Number(data.transactionDate) : undefined,
    });
    return this.mapTxnResponse(txn);
  }

  @GrpcMethod('TransactionService', 'UpdateTransactionStatus')
  async updateTransactionStatus(data: { transactionId: string; newStatus: string }) {
    const txn = await this.transactionsService.updateTransactionStatus(
      data.transactionId,
      data.newStatus as TransactionStatus,
    );
    return this.mapTxnResponse(txn);
  }

  @GrpcMethod('TransactionService', 'GetBudgetStatus')
  async getBudgetStatus(data: { userId: string; category: string; period?: string }) {
    const status = await this.transactionsService.getBudgetStatus(
      data.userId,
      data.category,
      data.period,
    );
    return {
      category: status.category,
      limitMinor: status.limitMinor.toString(),
      spentMinor: status.spentMinor.toString(),
      spentPercent: status.spentPercent,
      isOverBudget: status.isOverBudget,
      alertTriggered: status.alertTriggered,
      aiSuggestion: status.aiSuggestion,
    };
  }

  @GrpcMethod('TransactionService', 'GetCardRecommendation')
  async getCardRecommendation(data: {
    userId: string;
    merchantMcc: string;
    amountMinor: string;
    currency: string;
  }) {
    const rec = await this.transactionsService.getCardRecommendation(
      data.userId,
      data.merchantMcc,
      Number(data.amountMinor),
      data.currency as CurrencyCode,
    );

    if (!rec) {
      return {
        cardId: '',
        cardName: 'No active cards found',
        issuer: '',
        rewardRate: 0,
        rewardType: '',
        rewardProgram: '',
        estimatedReward: 0,
        reasoning: 'Please add a credit card to optimize rewards.',
      };
    }

    return {
      cardId: rec.cardId,
      cardName: rec.cardName,
      issuer: rec.issuer,
      rewardRate: rec.rewardRate,
      rewardType: rec.rewardType,
      rewardProgram: rec.rewardProgram,
      estimatedReward: rec.estimatedReward,
      reasoning: rec.reasoning,
    };
  }

  private mapTxnResponse(txn: TransactionEntity) {
    return {
      transactionId: txn.id,
      userId: txn.userId,
      accountId: txn.accountId,
      type: txn.transactionType,
      status: txn.status,
      amountMinor: txn.amountMinor.toString(),
      currency: txn.currency,
      merchantName: txn.merchantName || '',
      merchantMcc: txn.merchantMcc || '',
      category: txn.category || 'general',
      source: txn.source || 'manual',
      transactionDate: txn.transactionDate.getTime().toString(),
      createdAt: txn.createdAt.getTime().toString(),
    };
  }
}
