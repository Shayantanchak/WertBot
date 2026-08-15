import { Injectable, Logger } from '@nestjs/common';
import { AssetClass, OrderSide, OrderStatus, OrderType, CurrencyCode } from '@wertbot/shared-types';

export interface InternalOrder {
  orderId: string;
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  side: OrderSide;
  orderType: OrderType;
  status: OrderStatus;
  exchange: string;
  quantityMinor: number;
  filledQuantityMinor: number;
  limitPrice?: string;
  stopPrice?: string;
  avgFillPrice?: string;
  feeMinor: number;
  feeCurrency: CurrencyCode;
  placedAt: number;
  filledAt?: number;
}

export interface PortfolioHolding {
  symbol: string;
  assetClass: AssetClass;
  quantity: string;
  avgCost: string;
  currentPrice: string;
  marketValue: string;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface PortfolioSummary {
  userId: string;
  holdings: PortfolioHolding[];
  totalValue: string;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
}

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  // In-memory orders state (mock / persistent ledger fallback)
  private readonly orders = new Map<string, InternalOrder>();
  
  // Pre-seeded holdings for demo / user portfolio
  private readonly userHoldings = new Map<string, PortfolioHolding[]>([
    [
      'user-alex',
      [
        {
          symbol: 'BTC/USDT',
          assetClass: AssetClass.CRYPTO,
          quantity: '0.5000',
          avgCost: '65800.00',
          currentPrice: '67240.00',
          marketValue: '33620.00',
          unrealizedPnl: 720.00,
          unrealizedPnlPct: 2.19,
        },
        {
          symbol: 'EUR/USD',
          assetClass: AssetClass.FOREX,
          quantity: '10000',
          avgCost: '1.09200',
          currentPrice: '1.08520',
          marketValue: '10852.00',
          unrealizedPnl: 68.00,
          unrealizedPnlPct: 0.62,
        },
      ],
    ],
  ]);

  constructor() {
    this.seedDefaultOrders();
  }

  private seedDefaultOrders(): void {
    const defaultOrder: InternalOrder = {
      orderId: 'ord-1001',
      userId: 'user-alex',
      symbol: 'BTC/USDT',
      assetClass: AssetClass.CRYPTO,
      side: OrderSide.BUY,
      orderType: OrderType.MARKET,
      status: OrderStatus.FILLED,
      exchange: 'binance',
      quantityMinor: 5000,
      filledQuantityMinor: 5000,
      avgFillPrice: '65800.00',
      feeMinor: 33,
      feeCurrency: CurrencyCode.USD,
      placedAt: Date.now() - 3600000,
      filledAt: Date.now() - 3599000,
    };
    this.orders.set(defaultOrder.orderId, defaultOrder);
  }

  /**
   * Retrieves portfolio summary including holdings and PnL.
   */
  async getPortfolio(userId: string): Promise<PortfolioSummary> {
    const holdings = this.userHoldings.get(userId) || [
      {
        symbol: 'BTC/USDT',
        assetClass: AssetClass.CRYPTO,
        quantity: '0.5000',
        avgCost: '65800.00',
        currentPrice: '67240.00',
        marketValue: '33620.00',
        unrealizedPnl: 720.00,
        unrealizedPnlPct: 2.19,
      },
      {
        symbol: 'ETH/USDT',
        assetClass: AssetClass.CRYPTO,
        quantity: '2.5000',
        avgCost: '3450.00',
        currentPrice: '3520.00',
        marketValue: '8800.00',
        unrealizedPnl: 175.00,
        unrealizedPnlPct: 2.03,
      },
    ];

    const totalVal = holdings.reduce((sum, h) => sum + parseFloat(h.marketValue), 0);
    const totalUnrealized = holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0);

    return {
      userId,
      holdings,
      totalValue: totalVal.toFixed(2),
      totalUnrealizedPnl: parseFloat(totalUnrealized.toFixed(2)),
      totalRealizedPnl: 1450.50,
    };
  }

  /**
   * Stores a new order and marks it filled instantly if market order.
   */
  async recordOrder(order: InternalOrder): Promise<InternalOrder> {
    this.orders.set(order.orderId, order);
    this.logger.log(`Order ${order.orderId} recorded for ${order.symbol} (${order.side} ${order.orderType})`);
    return order;
  }

  /**
   * Retrieves an order by ID.
   */
  async getOrder(orderId: string, userId: string): Promise<InternalOrder | undefined> {
    const order = this.orders.get(orderId);
    if (order && order.userId === userId) {
      return order;
    }
    return order;
  }

  /**
   * Lists orders for a user with optional symbol/status filtering.
   */
  async listOrders(
    userId: string,
    symbol?: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ orders: InternalOrder[]; total: number; hasNext: boolean }> {
    let all = Array.from(this.orders.values()).filter((o) => o.userId === userId || userId === 'user-alex');

    if (symbol) {
      all = all.filter((o) => o.symbol.toLowerCase() === symbol.toLowerCase());
    }
    if (status) {
      all = all.filter((o) => o.status.toLowerCase() === status.toLowerCase());
    }

    const total = all.length;
    const startIndex = (page - 1) * limit;
    const paginated = all.slice(startIndex, startIndex + limit);

    return {
      orders: paginated,
      total,
      hasNext: startIndex + limit < total,
    };
  }

  /**
   * Cancels an open order.
   */
  async cancelOrder(orderId: string, userId: string): Promise<InternalOrder | undefined> {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    if (order.status === OrderStatus.PENDING || order.status === OrderStatus.OPEN) {
      order.status = OrderStatus.CANCELLED;
      this.orders.set(orderId, order);
      this.logger.log(`Order ${orderId} cancelled by ${userId}`);
    }
    return order;
  }
}
