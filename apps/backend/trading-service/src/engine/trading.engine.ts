import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { EventEmitter } from 'events';
import { MarketTick, AssetClass } from '@wertbot/shared-types';
import { BinanceStream } from '../streams/binance.ws';
import { OandaStream } from '../streams/oanda.ws';

// =============================================================================
// WertBot — High-Frequency Trading Engine
//
// Architecture:
// - Main thread: Manages WebSocket connections, distributes ticks
// - Worker threads: Perform CPU-intensive technical analysis (< 50ms target)
// - Redis cache: Sub-millisecond price data caching
// - Event emitter: Real-time signal broadcasting to subscribers
//
// Latency budget:
//   WebSocket tick → Worker analysis → Signal → Order: < 50ms
// =============================================================================

export interface HftSignal {
  symbol: string;
  assetClass: AssetClass;
  direction: 'long' | 'short' | 'neutral';
  confidence: number;        // 0.0 to 1.0
  entryPrice: string;
  targetPrice: string;
  stopLossPrice: string;
  reasoning: string;
  generatedAt: number;       // Unix timestamp ms
  latencyMs: number;         // Time from tick receipt to signal
}

export interface EngineStats {
  ticksProcessed: number;
  signalsGenerated: number;
  averageLatencyMs: number;
  activeSubscriptions: string[];
  workerCount: number;
  uptime: number;
}

@Injectable()
export class TradingEngine extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TradingEngine.name);

  // Worker thread pool for parallel technical analysis
  private workers: Worker[] = [];
  private workerIndex = 0;
  private readonly WORKER_COUNT = 4; // 4 CPU-bound analysis workers

  // Price tick buffer per symbol (ring buffer of last 200 ticks)
  private readonly tickBuffers = new Map<string, MarketTick[]>();
  private readonly BUFFER_SIZE = 200;

  // Performance metrics
  private ticksProcessed = 0;
  private signalsGenerated = 0;
  private totalLatency = 0;
  private startTime = Date.now();

  // Active signal subscriptions
  private readonly subscribers = new Map<string, Set<string>>(); // symbol → Set<userId>

  constructor(
    private readonly configService: ConfigService,
    private readonly binanceStream: BinanceStream,
    private readonly oandaStream: OandaStream,
  ) {
    super();
    this.setMaxListeners(1000); // Support many concurrent subscribers
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  async onModuleInit() {
    this.logger.log('🚀 Initializing HFT Trading Engine...');
    await this.initWorkerPool();
    this.setupStreamHandlers();
    this.logger.log(`✅ HFT Engine ready with ${this.WORKER_COUNT} analysis workers`);
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down HFT Engine...');
    await this.terminateWorkers();
    this.binanceStream.disconnect();
    this.oandaStream.disconnect();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to real-time signals for a symbol.
   * Returns an async generator that yields HftSignal objects.
   */
  async* subscribeToSignals(
    userId: string,
    symbols: string[],
  ): AsyncGenerator<HftSignal, void, unknown> {
    // Register subscriptions
    for (const symbol of symbols) {
      if (!this.subscribers.has(symbol)) {
        this.subscribers.set(symbol, new Set());
        // Connect to market data stream
        await this.subscribeToMarketData(symbol);
      }
      this.subscribers.get(symbol)!.add(userId);
    }

    const signalQueue: HftSignal[] = [];
    const onSignal = (signal: HftSignal) => {
      if (symbols.includes(signal.symbol)) {
        signalQueue.push(signal);
      }
    };

    this.on('signal', onSignal);

    try {
      while (true) {
        if (signalQueue.length > 0) {
          yield signalQueue.shift()!;
        } else {
          // Wait for next signal (non-blocking check every 10ms)
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } finally {
      this.off('signal', onSignal);
      // Clean up subscriptions
      for (const symbol of symbols) {
        this.subscribers.get(symbol)?.delete(userId);
      }
    }
  }

  /**
   * Process a single market tick — called by WebSocket stream handlers.
   * Target: complete analysis in < 50ms
   */
  async processTick(tick: MarketTick): Promise<void> {
    const receiveTime = performance.now();
    this.ticksProcessed++;

    // Update ring buffer
    this.addToBuffer(tick);

    // Get buffer for analysis
    const buffer = this.tickBuffers.get(tick.symbol) ?? [];
    if (buffer.length < 20) return; // Need minimum data for indicators

    // Distribute to next worker in round-robin
    const worker = this.getNextWorker();

    // Send analysis job to worker thread (non-blocking)
    const analysisResult = await this.runWorkerAnalysis(worker, {
      symbol: tick.symbol,
      assetClass: tick.assetClass,
      currentTick: tick,
      buffer: buffer.slice(-100), // Send last 100 ticks
    });

    if (analysisResult && analysisResult.confidence > 0.65) {
      const latencyMs = performance.now() - receiveTime;
      this.totalLatency += latencyMs;
      this.signalsGenerated++;

      const signal: HftSignal = {
        symbol: tick.symbol,
        assetClass: tick.assetClass,
        direction: analysisResult.direction,
        confidence: analysisResult.confidence,
        entryPrice: tick.price,
        targetPrice: analysisResult.targetPrice,
        stopLossPrice: analysisResult.stopLossPrice,
        reasoning: analysisResult.reasoning,
        generatedAt: Date.now(),
        latencyMs: Math.round(latencyMs),
      };

      if (latencyMs > 50) {
        this.logger.warn(`⚠️ Latency breach: ${latencyMs.toFixed(1)}ms for ${tick.symbol}`);
      }

      // Broadcast signal
      this.emit('signal', signal);
    }
  }

  getStats(): EngineStats {
    return {
      ticksProcessed: this.ticksProcessed,
      signalsGenerated: this.signalsGenerated,
      averageLatencyMs: this.ticksProcessed > 0 ? this.totalLatency / this.signalsGenerated : 0,
      activeSubscriptions: Array.from(this.subscribers.keys()),
      workerCount: this.workers.length,
      uptime: Date.now() - this.startTime,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Worker Thread Pool
  // ─────────────────────────────────────────────────────────────────────────

  private async initWorkerPool(): Promise<void> {
    for (let i = 0; i < this.WORKER_COUNT; i++) {
      const worker = new Worker(
        path.join(__dirname, '../engine/analysis.worker.js'),
        {
          workerData: { workerId: i },
        },
      );

      worker.on('error', (err) => {
        this.logger.error(`Worker ${i} error: ${err.message}`);
        this.restartWorker(i);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.warn(`Worker ${i} exited with code ${code} — restarting`);
          this.restartWorker(i);
        }
      });

      this.workers.push(worker);
      this.logger.debug(`Analysis worker ${i} initialized`);
    }
  }

  private async restartWorker(index: number): Promise<void> {
    try {
      await this.workers[index]?.terminate();
    } catch { /* ignore */ }

    const worker = new Worker(
      path.join(__dirname, '../engine/analysis.worker.js'),
      { workerData: { workerId: index } },
    );
    this.workers[index] = worker;
    this.logger.log(`Worker ${index} restarted`);
  }

  private async terminateWorkers(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.terminate()));
    this.workers = [];
  }

  private getNextWorker(): Worker {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.WORKER_COUNT;
    return worker;
  }

  private runWorkerAnalysis(
    worker: Worker,
    data: {
      symbol: string;
      assetClass: AssetClass;
      currentTick: MarketTick;
      buffer: MarketTick[];
    },
  ): Promise<{
    direction: 'long' | 'short' | 'neutral';
    confidence: number;
    targetPrice: string;
    stopLossPrice: string;
    reasoning: string;
  } | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 45); // 45ms timeout

      const handler = (result: { jobId: string; analysis: typeof resolve extends (arg: infer A) => void ? A : never }) => {
        clearTimeout(timeout);
        worker.off('message', handler);
        resolve(result.analysis);
      };

      worker.on('message', handler);
      worker.postMessage({ type: 'ANALYZE', data });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Market Data Streaming
  // ─────────────────────────────────────────────────────────────────────────

  private setupStreamHandlers(): void {
    this.binanceStream.on('tick', (tick: MarketTick) => {
      this.processTick(tick).catch((err) =>
        this.logger.error(`Tick processing error: ${err.message}`),
      );
    });

    this.oandaStream.on('tick', (tick: MarketTick) => {
      this.processTick(tick).catch((err) =>
        this.logger.error(`OANDA tick error: ${err.message}`),
      );
    });
  }

  private async subscribeToMarketData(symbol: string): Promise<void> {
    // Determine exchange from symbol format
    if (symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH')) {
      await this.binanceStream.subscribe([symbol]);
    } else if (symbol.includes('/')) {
      // Forex format: EUR/USD
      await this.oandaStream.subscribe([symbol]);
    }
  }

  private addToBuffer(tick: MarketTick): void {
    if (!this.tickBuffers.has(tick.symbol)) {
      this.tickBuffers.set(tick.symbol, []);
    }
    const buffer = this.tickBuffers.get(tick.symbol)!;
    buffer.push(tick);
    if (buffer.length > this.BUFFER_SIZE) {
      buffer.shift(); // Remove oldest tick (ring buffer)
    }
  }
}
