import { Injectable, Logger } from '@nestjs/common';
import { AiSessionType } from '@wertbot/shared-types';
import { GeminiService } from '../gemini/gemini.service';
import { MarketNewsService } from '../research/market-news.service';

export interface ChatMessageRequestDto {
  userId: string;
  sessionType: AiSessionType;
  message: string;
  cardPortfolio?: Array<{ name: string; issuer: string; lastFour?: string }>;
  transactionContext?: { vendor?: string; mcc?: string; amountMinor?: number; currency?: string };
}

@Injectable()
export class ChatRouterService {
  private readonly logger = new Logger(ChatRouterService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly marketNewsService: MarketNewsService,
  ) {}

  /**
   * Processes incoming user query by injecting dynamic context relevant to the selected agent persona.
   */
  async processUserMessage(dto: ChatMessageRequestDto) {
    this.logger.log(`Routing chat request for user=${dto.userId}, mode=${dto.sessionType}`);

    let enrichedContext: Record<string, unknown> = {};

    switch (dto.sessionType) {
      case AiSessionType.BUDGET_PFM:
        enrichedContext = await this.getBudgetContext(dto.userId);
        break;

      case AiSessionType.CARD_CONCIERGE:
        enrichedContext = await this.getCardConciergeContext(dto.userId, dto.cardPortfolio, dto.transactionContext);
        break;

      case AiSessionType.GLOBAL_WEALTH:
        enrichedContext = await this.getGlobalWealthContext();
        break;

      case AiSessionType.MARKET_RESEARCH:
        enrichedContext = await this.getResearchContext();
        break;

      default:
        enrichedContext = { info: 'Standard financial co-pilot context active.' };
        break;
    }

    return this.geminiService.generateResponse({
      userId: dto.userId,
      sessionType: dto.sessionType,
      prompt: dto.message,
      contextOverride: enrichedContext,
    });
  }

  private async getBudgetContext(userId: string) {
    return {
      monthlyBudgetLimitUSD: 4500,
      currentSpentUSD: 1820,
      remainingUSD: 2680,
      burnRatePerDayUSD: 60.66,
      topSpendCategories: [
        { category: 'dining', spentUSD: 520, pctOfBudget: 28.5 },
        { category: 'groceries', spentUSD: 450, pctOfBudget: 24.7 },
        { category: 'transport', spentUSD: 280, pctOfBudget: 15.3 },
      ],
      savingGoal: 'Emergency Fund 6 Months',
    };
  }

  private async getCardConciergeContext(
    userId: string,
    userPortfolio?: Array<{ name: string; issuer: string }>,
    txContext?: { vendor?: string; mcc?: string; amountMinor?: number },
  ) {
    const portfolio = userPortfolio && userPortfolio.length > 0
      ? userPortfolio
      : [
          { name: 'Amex Gold Card', issuer: 'American Express', perks: '4x Dining, 4x U.S. Supermarkets' },
          { name: 'Chase Sapphire Preferred', issuer: 'Chase', perks: '3x Dining, 2x Travel, 1:1 Transfer Partners' },
          { name: 'Capital One Venture X', issuer: 'Capital One', perks: '2x All Purchases, Unlimited Airport Lounge Access' },
        ];

    const currentTx = txContext || {
      vendor: 'Starbucks Coffee',
      mcc: '5814',
      mccCategory: 'dining / fast food',
      amountMinor: 1450, // $14.50
    };

    return {
      userCardPortfolio: portfolio,
      currentTransaction: currentTx,
      globalCardHighlights: [
        { card: 'HDFC Regalia Gold', country: 'India', highlight: '12 Free Airport Lounge Visits + 4x Reward Points' },
        { card: 'Amex Platinum', country: 'Global', highlight: 'Centurion Lounge Access + $200 Hotel Credit' },
      ],
    };
  }

  private async getGlobalWealthContext() {
    const marketData = await this.marketNewsService.getLatestGlobalFinancialNews();
    return {
      globalNews: marketData.news,
      marketTickers: marketData.tickers,
      macroeconomicIndicators: marketData.macroIndicators,
      investmentOptions: {
        fixedIncomeFDs: '7.5% - 8.5% p.a. guaranteed returns',
        sipMutualFunds: 'Historical 12%-15% p.a. CAGR in Large & Midcap funds',
        forexPairs: 'EUR/USD, USD/JPY, GBP/USD active volatility',
        cryptoYields: 'BTC / ETH Staking & Strategic Rebalancing',
      },
    };
  }

  private async getResearchContext() {
    const marketData = await this.marketNewsService.getLatestGlobalFinancialNews();
    return {
      latestResearch: marketData.news.filter((n) => n.category === 'macro' || n.category === 'central_banks'),
      valuationMultiples: {
        sp500ForwardPE: 21.4,
        nasdaqPE: 28.2,
        tenYearTreasuryYield: '4.22%',
      },
    };
  }
}
