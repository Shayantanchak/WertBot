/**
 * WertBot — HFT Analysis Worker Thread
 * 
 * This runs in a separate Worker Thread to perform CPU-intensive
 * technical analysis without blocking the main event loop.
 * 
 * Indicators computed:
 * - RSI (Relative Strength Index) — 14 periods
 * - MACD (Moving Average Convergence Divergence) — 12/26/9
 * - Bollinger Bands — 20 periods, 2σ
 * - Volume Profile — buy/sell pressure
 * - Momentum — Rate of Change (ROC)
 * 
 * Target: Complete all calculations in < 30ms
 */

const { parentPort, workerData } = require('worker_threads');

const workerId = workerData?.workerId ?? 0;

// ─────────────────────────────────────────────────────────────────────────────
// Message Handler
// ─────────────────────────────────────────────────────────────────────────────

parentPort.on('message', (message) => {
  if (message.type === 'ANALYZE') {
    const startTime = performance.now();
    const { data } = message;
    
    try {
      const analysis = analyzeMarketData(data);
      const latency = performance.now() - startTime;
      
      parentPort.postMessage({
        type: 'ANALYSIS_RESULT',
        analysis,
        latencyMs: latency,
      });
    } catch (error) {
      parentPort.postMessage({
        type: 'ERROR',
        error: error.message,
      });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Core Analysis Function
// ─────────────────────────────────────────────────────────────────────────────

function analyzeMarketData(data) {
  const { buffer, currentTick } = data;
  
  if (buffer.length < 20) {
    return null; // Insufficient data
  }
  
  const prices = buffer.map((t) => parseFloat(t.price));
  const volumes = buffer.map((t) => parseFloat(t.volume));
  const currentPrice = parseFloat(currentTick.price);
  
  // Compute technical indicators
  const rsi = computeRSI(prices, 14);
  const { macd, signal: macdSignal, histogram } = computeMACD(prices, 12, 26, 9);
  const { upper, lower, middle } = computeBollingerBands(prices, 20, 2);
  const momentum = computeMomentum(prices, 10);
  const volumePressure = computeVolumePressure(volumes);
  
  // Generate directional prediction
  const direction = determineDirection({
    rsi,
    macd,
    macdSignal,
    histogram,
    currentPrice,
    upper,
    lower,
    middle,
    momentum,
    volumePressure,
  });
  
  const confidence = computeConfidence({
    rsi,
    macd,
    macdSignal,
    histogram,
    direction,
    volumePressure,
    momentum,
  });
  
  // Calculate target and stop-loss using ATR
  const atr = computeATR(buffer, 14);
  const { targetPrice, stopLossPrice } = computePriceLevels(
    currentPrice,
    direction,
    atr,
  );
  
  const reasoning = buildReasoning({
    rsi,
    macd,
    histogram,
    direction,
    currentPrice,
    upper,
    lower,
    volumePressure,
    momentum,
  });
  
  return {
    direction,
    confidence,
    targetPrice: targetPrice.toFixed(8),
    stopLossPrice: stopLossPrice.toFixed(8),
    indicators: { rsi, macd, histogram, momentum, volumePressure },
    reasoning,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Technical Indicator Implementations
// ─────────────────────────────────────────────────────────────────────────────

/** RSI — Relative Strength Index */
function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1];
    if (delta > 0) gains += delta;
    else losses += Math.abs(delta);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** EMA — Exponential Moving Average */
function computeEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  
  return ema;
}

/** MACD — Moving Average Convergence Divergence */
function computeMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  
  const fastEMA = computeEMA(prices, fastPeriod);
  const slowEMA = computeEMA(prices, slowPeriod);
  const macd = fastEMA - slowEMA;
  
  // Signal line = EMA of MACD values (simplified: use current macd)
  const signal = macd * (2 / (signalPeriod + 1));
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

/** Bollinger Bands */
function computeBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
  const slice = prices.slice(-period);
  if (slice.length < period) return { upper: 0, lower: 0, middle: 0 };
  
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: middle + stdDevMultiplier * stdDev,
    lower: middle - stdDevMultiplier * stdDev,
    middle,
  };
}

/** Momentum — Rate of Change */
function computeMomentum(prices, period = 10) {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return ((current - past) / past) * 100;
}

/** Volume Pressure — Buy vs Sell pressure */
function computeVolumePressure(volumes) {
  if (volumes.length < 2) return 0;
  const recent = volumes.slice(-5);
  const older = volumes.slice(-10, -5);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
}

/** ATR — Average True Range for volatility-adjusted stop/target */
function computeATR(buffer, period = 14) {
  if (buffer.length < period + 1) return 0;
  
  const trueRanges = [];
  for (let i = buffer.length - period; i < buffer.length; i++) {
    const high = parseFloat(buffer[i].ask || buffer[i].price);
    const low = parseFloat(buffer[i].bid || buffer[i].price);
    const prevClose = parseFloat(buffer[i - 1].price);
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  
  return trueRanges.reduce((a, b) => a + b, 0) / period;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal Logic
// ─────────────────────────────────────────────────────────────────────────────

function determineDirection({ rsi, macd, macdSignal, histogram, currentPrice, upper, lower, middle, momentum, volumePressure }) {
  let bullishPoints = 0;
  let bearishPoints = 0;
  
  // RSI signals
  if (rsi < 30) bullishPoints += 3;       // Oversold → bullish
  else if (rsi < 45) bullishPoints += 1;
  else if (rsi > 70) bearishPoints += 3;  // Overbought → bearish
  else if (rsi > 55) bearishPoints += 1;
  
  // MACD crossover
  if (macd > macdSignal && histogram > 0) bullishPoints += 2;
  if (macd < macdSignal && histogram < 0) bearishPoints += 2;
  
  // Bollinger Band position
  if (lower > 0 && currentPrice < lower) bullishPoints += 2;  // Price below lower band
  if (upper > 0 && currentPrice > upper) bearishPoints += 2;  // Price above upper band
  if (currentPrice > middle) bullishPoints += 1;
  else bearishPoints += 1;
  
  // Momentum
  if (momentum > 0.5) bullishPoints += 1;
  if (momentum < -0.5) bearishPoints += 1;
  
  // Volume pressure
  if (volumePressure > 0.1) bullishPoints += 1;
  if (volumePressure < -0.1) bearishPoints += 1;
  
  const threshold = 3;
  if (bullishPoints - bearishPoints >= threshold) return 'long';
  if (bearishPoints - bullishPoints >= threshold) return 'short';
  return 'neutral';
}

function computeConfidence({ rsi, macd, macdSignal, histogram, direction, volumePressure, momentum }) {
  if (direction === 'neutral') return 0;
  
  let score = 0.5; // Base confidence
  
  // Strong RSI signals
  if (direction === 'long' && rsi < 30) score += 0.15;
  if (direction === 'short' && rsi > 70) score += 0.15;
  
  // MACD alignment
  const macdAligned = direction === 'long' ? macd > macdSignal : macd < macdSignal;
  if (macdAligned) score += 0.1;
  
  // Volume confirmation
  if (Math.abs(volumePressure) > 0.2) score += 0.1;
  
  // Momentum confirmation
  if (direction === 'long' && momentum > 0) score += 0.05;
  if (direction === 'short' && momentum < 0) score += 0.05;
  
  return Math.min(0.95, score); // Cap at 95%
}

function computePriceLevels(currentPrice, direction, atr) {
  const atrMultiplier = 1.5;
  const rewardRiskRatio = 2.0; // 2:1 reward/risk
  
  if (direction === 'long') {
    const stopLossPrice = currentPrice - atr * atrMultiplier;
    const targetPrice = currentPrice + atr * atrMultiplier * rewardRiskRatio;
    return { targetPrice, stopLossPrice };
  } else {
    const stopLossPrice = currentPrice + atr * atrMultiplier;
    const targetPrice = currentPrice - atr * atrMultiplier * rewardRiskRatio;
    return { targetPrice, stopLossPrice };
  }
}

function buildReasoning({ rsi, macd, histogram, direction, currentPrice, upper, lower, volumePressure, momentum }) {
  const signals = [];
  
  if (rsi < 30) signals.push(`RSI oversold at ${rsi.toFixed(1)}`);
  else if (rsi > 70) signals.push(`RSI overbought at ${rsi.toFixed(1)}`);
  else signals.push(`RSI neutral at ${rsi.toFixed(1)}`);
  
  if (histogram > 0) signals.push('MACD bullish crossover');
  else if (histogram < 0) signals.push('MACD bearish crossover');
  
  if (lower > 0 && currentPrice < lower) signals.push('Price below lower Bollinger Band');
  else if (upper > 0 && currentPrice > upper) signals.push('Price above upper Bollinger Band');
  
  if (volumePressure > 0.1) signals.push('Elevated buy-side volume pressure');
  else if (volumePressure < -0.1) signals.push('Elevated sell-side volume pressure');
  
  return signals.join(' | ');
}
