import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { PricePredictorService } from './predictor/price-predictor.service';
import { PortfolioService, InternalOrder } from './portfolio/portfolio.service';
import { RiskManagementService } from './risk/risk-management.service';
import { TradingEngine } from './engine/trading.engine';
import { OrderSide, OrderType, OrderStatus, AssetClass, CurrencyCode } from '@wertbot/shared-types';

@Controller()
export class TradingController {
  private readonly logger = new Logger(TradingController.name);

  constructor(
    private readonly pricePredictor: PricePredictorService,
    private readonly portfolioService: PortfolioService,
    private readonly riskService: RiskManagementService,
    private readonly tradingEngine: TradingEngine,
  ) {}

  @GrpcMethod('TradingService', 'PlaceOrder')
  async placeOrder(data: {
    user_id: string;
    symbol: string;
    asset_class: string;
    side: string;
    order_type: string;
    exchange: string;
    quantity_minor: number;
    limit_price?: string;
    stop_price?: string;
  }) {
    const assetClass = (data.asset_class || 'CRYPTO').toUpperCase() as AssetClass;
    const side = (data.side || 'BUY').toUpperCase() as OrderSide;
    const orderType = (data.order_type || 'MARKET').toUpperCase() as OrderType;

    // Pre-trade risk validation
    this.riskService.validateOrder({
      userId: data.user_id,
      symbol: data.symbol,
      assetClass,
      side,
      orderType,
      quantityMinor: Number(data.quantity_minor || 100),
      limitPrice: data.limit_price,
      stopPrice: data.stop_price,
    });

    const now = Date.now();
    const orderId = `ord-${now.toString().slice(-6)}`;
    const avgFillPrice = data.limit_price || (data.symbol.includes('/') ? '1.08520' : '67240.00');

    const internalOrder: InternalOrder = {
      orderId,
      userId: data.user_id || 'user-alex',
      symbol: data.symbol,
      assetClass,
      side,
      orderType,
      status: OrderStatus.FILLED,
      exchange: data.exchange || 'binance',
      quantityMinor: Number(data.quantity_minor || 100),
      filledQuantityMinor: Number(data.quantity_minor || 100),
      limitPrice: data.limit_price,
      stopPrice: data.stop_price,
      avgFillPrice,
      feeMinor: Math.round(Number(data.quantity_minor || 100) * 0.001),
      feeCurrency: CurrencyCode.USD,
      placedAt: now,
      filledAt: now + 15, // 15ms execution latency target
    };

    const saved = await this.portfolioService.recordOrder(internalOrder);

    return {
      order_id: saved.orderId,
      user_id: saved.userId,
      symbol: saved.symbol,
      side: saved.side,
      order_type: saved.orderType,
      status: saved.status,
      exchange: saved.exchange,
      quantity_minor: saved.quantityMinor,
      filled_quantity_minor: saved.filledQuantityMinor,
      avg_fill_price: saved.avgFillPrice || '0.00',
      fee_minor: saved.feeMinor,
      fee_currency: saved.feeCurrency,
      placed_at: saved.placedAt,
      filled_at: saved.filledAt || 0,
    };
  }

  @GrpcMethod('TradingService', 'CancelOrder')
  async cancelOrder(data: { order_id: string; user_id: string }) {
    const cancelled = await this.portfolioService.cancelOrder(data.order_id, data.user_id);
    if (!cancelled) {
      return {
        order_id: data.order_id,
        user_id: data.user_id,
        status: OrderStatus.REJECTED,
      };
    }
    return {
      order_id: cancelled.orderId,
      user_id: cancelled.userId,
      symbol: cancelled.symbol,
      side: cancelled.side,
      order_type: cancelled.orderType,
      status: cancelled.status,
      exchange: cancelled.exchange,
      quantity_minor: cancelled.quantityMinor,
      filled_quantity_minor: cancelled.filledQuantityMinor,
      avg_fill_price: cancelled.avgFillPrice || '0.00',
      fee_minor: cancelled.feeMinor,
      fee_currency: cancelled.feeCurrency,
      placed_at: cancelled.placedAt,
      filled_at: cancelled.filledAt || 0,
    };
  }

  @GrpcMethod('TradingService', 'GetOrder')
  async getOrder(data: { order_id: string; user_id: string }) {
    const order = await this.portfolioService.getOrder(data.order_id, data.user_id);
    if (!order) {
      return { order_id: data.order_id, user_id: data.user_id, status: 'NOT_FOUND' };
    }
    return {
      order_id: order.orderId,
      user_id: order.userId,
      symbol: order.symbol,
      side: order.side,
      order_type: order.orderType,
      status: order.status,
      exchange: order.exchange,
      quantity_minor: order.quantityMinor,
      filled_quantity_minor: order.filledQuantityMinor,
      avg_fill_price: order.avgFillPrice || '0.00',
      fee_minor: order.feeMinor,
      fee_currency: order.feeCurrency,
      placed_at: order.placedAt,
      filled_at: order.filledAt || 0,
    };
  }

  @GrpcMethod('TradingService', 'ListOrders')
  async listOrders(data: { user_id: string; symbol?: string; status?: string; page?: number; limit?: number }) {
    const result = await this.portfolioService.listOrders(
      data.user_id,
      data.symbol,
      data.status,
      data.page || 1,
      data.limit || 10,
    );

    return {
      orders: result.orders.map((o) => ({
        order_id: o.orderId,
        user_id: o.userId,
        symbol: o.symbol,
        side: o.side,
        order_type: o.orderType,
        status: o.status,
        exchange: o.exchange,
        quantity_minor: o.quantityMinor,
        filled_quantity_minor: o.filledQuantityMinor,
        avg_fill_price: o.avgFillPrice || '0.00',
        fee_minor: o.feeMinor,
        fee_currency: o.feeCurrency,
        placed_at: o.placedAt,
        filled_at: o.filledAt || 0,
      })),
      total: result.total,
      has_next: result.hasNext,
    };
  }

  @GrpcMethod('TradingService', 'GetPortfolio')
  async getPortfolio(data: { user_id: string }) {
    const pf = await this.portfolioService.getPortfolio(data.user_id);
    return {
      user_id: pf.userId,
      holdings: pf.holdings.map((h) => ({
        symbol: h.symbol,
        asset_class: h.assetClass,
        quantity: h.quantity,
        avg_cost: h.avgCost,
        current_price: h.currentPrice,
        market_value: h.marketValue,
        unrealized_pnl: h.unrealizedPnl,
        unrealized_pnl_pct: h.unrealizedPnlPct,
      })),
      total_value: pf.totalValue,
      total_unrealized_pnl: pf.totalUnrealizedPnl,
      total_realized_pnl: pf.totalRealizedPnl,
    };
  }

  @GrpcMethod('TradingService', 'GetPricePrediction')
  async getPricePrediction(data: { symbol: string; asset_class?: string; timeframe?: string }) {
    const assetClass = (data.asset_class || 'CRYPTO').toUpperCase() as AssetClass;
    const pred = await this.pricePredictor.predictPrice(data.symbol, assetClass, data.timeframe);
    return {
      symbol: pred.symbol,
      direction: pred.direction,
      confidence: pred.confidence,
      target_price: pred.targetPrice,
      stop_loss: pred.stopLoss,
      reasoning: pred.reasoning,
      generated_at: pred.generatedAt,
      rsi: pred.rsi,
      macd_signal: pred.macdSignal,
    };
  }

  @GrpcMethod('TradingService', 'StreamPriceTicks')
  streamPriceTicks(data: { symbols: string[]; user_id: string }): Observable<any> {
    const subject = new Subject<any>();
    const symbols = data.symbols.length > 0 ? data.symbols : ['BTC/USDT', 'EUR/USD'];

    const interval = setInterval(() => {
      for (const symbol of symbols) {
        const isForex = symbol.includes('/');
        const base = isForex ? 1.0852 : 67240.0;
        const change = (Math.random() - 0.49) * base * 0.001;
        const price = (base + change).toFixed(isForex ? 5 : 2);

        subject.next({
          symbol,
          exchange: isForex ? 'oanda' : 'binance',
          price,
          volume: isForex ? '100000' : '1.450',
          bid: price,
          ask: price,
          timestamp: Date.now(),
          asset_class: isForex ? 'FOREX' : 'CRYPTO',
        });
      }
    }, 1000);

    // Clean up on unsubscribe
    return new Observable((subscriber) => {
      const sub = subject.subscribe(subscriber);
      return () => {
        clearInterval(interval);
        sub.unsubscribe();
      };
    });
  }
}
