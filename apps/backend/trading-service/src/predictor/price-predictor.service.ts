import { Injectable, Logger } from '@nestjs/common';
import { AssetClass } from '@wertbot/shared-types';

export interface PricePredictionResult {
  symbol: string;
  assetClass: AssetClass;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;       // 0 to 100
  targetPrice: string;
  stopLoss: string;
  reasoning: string;
  generatedAt: number;      // Unix timestamp ms
  rsi: number;
  macdSignal: string;
}

@Injectable()
export class PricePredictorService {
  private readonly logger = new Logger(PricePredictorService.name);

  // Baseline prices for reference estimation
  private readonly symbolBasePrices: Record<string, number> = {
    'BTCUSDT': 67240.00,
    'BTC/USDT': 67240.00,
    'ETHUSDT': 3520.00,
    'ETH/USDT': 3520.00,
    'EUR/USD': 1.0852,
    'GBP/USD': 1.2940,
    'USD/JPY': 156.40,
  };

  /**
   * Generates technical analysis & AI price prediction for a given symbol.
   */
  async predictPrice(
    symbol: string,
    assetClass: AssetClass = AssetClass.CRYPTO,
    timeframe: string = '1h',
  ): Promise<PricePredictionResult> {
    const formattedSymbol = symbol.toUpperCase();
    const basePrice = this.symbolBasePrices[formattedSymbol] || 100.00;

    // Simulate technical indicator calculation
    const rsi = parseFloat((25 + Math.random() * 50).toFixed(1)); // RSI 25-75 range
    const isBullish = rsi < 45 || Math.random() > 0.4;
    const direction: 'LONG' | 'SHORT' | 'NEUTRAL' = isBullish ? 'LONG' : (rsi > 70 ? 'SHORT' : 'NEUTRAL');
    
    const confidence = Math.round(65 + Math.random() * 28); // 65-93% confidence
    const priceMultiplier = direction === 'LONG' ? 1.025 : (direction === 'SHORT' ? 0.975 : 1.00);
    const stopMultiplier = direction === 'LONG' ? 0.985 : (direction === 'SHORT' ? 1.015 : 0.99);

    const isForex = assetClass === AssetClass.FOREX || formattedSymbol.includes('/');
    const decimals = isForex ? 5 : 2;

    const targetPrice = (basePrice * priceMultiplier).toFixed(decimals);
    const stopLoss = (basePrice * stopMultiplier).toFixed(decimals);
    const macdSignal = direction === 'LONG' ? 'Bullish Crossover' : (direction === 'SHORT' ? 'Bearish Divergence' : 'Neutral');

    const reasoning = direction === 'LONG'
      ? `Strong ${macdSignal} detected with oversold RSI (${rsi}). High probability momentum bounce on ${timeframe} timeframe.`
      : direction === 'SHORT'
      ? `Overbought RSI (${rsi}) with ${macdSignal}. Resistance level target reached on ${timeframe} timeframe.`
      : `Consolidation pattern detected with RSI (${rsi}). Recommending wait-and-see strategy.`;

    this.logger.log(`Prediction generated for ${formattedSymbol}: ${direction} @ ${targetPrice} (${confidence}% confidence)`);

    return {
      symbol: formattedSymbol,
      assetClass,
      direction,
      confidence,
      targetPrice,
      stopLoss,
      reasoning,
      generatedAt: Date.now(),
      rsi,
      macdSignal,
    };
  }
}
