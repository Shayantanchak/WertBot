import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { MarketTick, AssetClass } from '@wertbot/shared-types';
import WebSocket from 'ws';

// =============================================================================
// Binance WebSocket Stream Adapter
// 
// Connects to Binance's combined stream endpoint for real-time market data.
// Handles: reconnection, heartbeat ping/pong, message parsing, error recovery
//
// Endpoint: wss://stream.binance.com:9443/stream?streams=
// Stream types:
//   - <symbol>@trade  — Individual trade ticks
//   - <symbol>@ticker — 24hr rolling stats
//   - <symbol>@depth5 — Top 5 order book
// =============================================================================

interface BinanceTrade {
  e: string;    // Event type: 'trade'
  E: number;    // Event time
  s: string;    // Symbol (e.g., BTCUSDT)
  p: string;    // Price
  q: string;    // Quantity
  b: string;    // Buyer order ID
  a: string;    // Seller order ID
  T: number;    // Trade time
  m: boolean;   // Is buyer market maker?
}

interface BinanceTicker {
  e: string;    // '24hrTicker'
  E: number;    // Event time
  s: string;    // Symbol
  c: string;    // Last price
  v: string;    // Total traded volume
  b: string;    // Best bid price
  a: string;    // Best ask price
}

@Injectable()
export class BinanceStream extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BinanceStream.name);
  
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isConnected = false;

  private readonly WS_BASE_URL = 'wss://stream.binance.com:9443/stream?streams=';

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async onModuleInit() {
    this.logger.log('Binance Stream service initialized (not connected — awaiting subscriptions)');
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  async subscribe(symbols: string[]): Promise<void> {
    const newSymbols = symbols.filter((s) => !this.subscribedSymbols.has(s));
    if (newSymbols.length === 0) return;

    newSymbols.forEach((s) => this.subscribedSymbols.add(s.toLowerCase()));
    this.logger.log(`Subscribing to Binance streams: ${newSymbols.join(', ')}`);
    
    // Reconnect with updated subscriptions
    this.disconnect();
    await this.connect();
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    symbols.forEach((s) => this.subscribedSymbols.delete(s.toLowerCase()));
    if (this.subscribedSymbols.size === 0) {
      this.disconnect();
    } else {
      this.disconnect();
      await this.connect();
    }
  }

  disconnect(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus(): { connected: boolean; symbols: string[]; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      symbols: Array.from(this.subscribedSymbols),
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Connection Management
  // ─────────────────────────────────────────────────────────────────────────

  private async connect(): Promise<void> {
    if (this.subscribedSymbols.size === 0) return;

    // Build combined stream URL
    // e.g., wss://...?streams=btcusdt@trade/ethusdt@trade
    const streams = Array.from(this.subscribedSymbols)
      .map((s) => `${s}@trade`)
      .join('/');
    
    const wsUrl = `${this.WS_BASE_URL}${streams}`;
    this.logger.log(`Connecting to Binance: ${wsUrl.substring(0, 80)}...`);

    const ws = new WebSocket(wsUrl, {
      handshakeTimeout: 5000,
      perMessageDeflate: false, // Disabled for lower latency
    });
    this.ws = ws;

    ws.on('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('✅ Binance WebSocket connected');
      this.startHeartbeat();
    });

    ws.on('message', (data) => {
      this.handleMessage(data.toString());
    });

    ws.on('error', (error) => {
      this.logger.error(`Binance WS error: ${error.message}`);
    });

    ws.on('close', (code, reason) => {
      this.isConnected = false;
      this.logger.warn(`Binance WS closed: ${code} — ${reason.toString()}`);
      this.scheduleReconnect();
    });

    ws.on('pong', () => {
      // Connection alive
    });
  }

  private handleMessage(raw: string): void {
    try {
      const envelope = JSON.parse(raw) as { stream: string; data: BinanceTrade | BinanceTicker };
      
      if (!envelope.data) return;
      
      const data = envelope.data;
      
      if (data.e === 'trade') {
        const trade = data as BinanceTrade;
        const tick: MarketTick = {
          symbol: trade.s,
          exchange: 'binance',
          price: trade.p,
          volume: trade.q,
          bid: trade.p,    // For trades, bid ≈ price
          ask: trade.p,
          timestamp: trade.T,
          assetClass: AssetClass.CRYPTO,
        };
        this.emit('tick', tick);
      }
    } catch (err) {
      this.logger.warn(`Failed to parse Binance message: ${(err as Error).message}`);
    }
  }

  private startHeartbeat(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30s (Binance disconnects after 24h if no activity)
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error('Max Binance reconnect attempts reached. Giving up.');
      this.emit('max_reconnect_exceeded');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.logger.log(`Reconnecting to Binance in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
