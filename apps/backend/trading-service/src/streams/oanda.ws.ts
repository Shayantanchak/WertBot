import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { MarketTick, AssetClass } from '@wertbot/shared-types';

// =============================================================================
// OANDA v20 Streaming API Adapter (Forex)
// 
// Uses OANDA's REST streaming endpoint for real-time pricing.
// Unlike Binance (WebSocket), OANDA uses HTTP streaming (chunked transfer).
// We wrap this in an EventEmitter-compatible interface.
//
// Docs: https://developer.oanda.com/rest-live-v20/pricing-ep/
// =============================================================================

@Injectable()
export class OandaStream extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(OandaStream.name);
  
  private activeRequest: any = null;
  private subscribedInstruments: Set<string> = new Set();
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 10;

  private readonly OANDA_ENV: 'practice' | 'live';
  private readonly API_KEY: string;
  private readonly ACCOUNT_ID: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.OANDA_ENV = this.configService.get<'practice' | 'live'>('OANDA_ENV', 'practice');
    this.API_KEY = this.configService.get<string>('OANDA_API_KEY', '');
    this.ACCOUNT_ID = this.configService.get<string>('OANDA_ACCOUNT_ID', '');
  }

  async onModuleDestroy() {
    this.disconnect();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────

  async subscribe(instruments: string[]): Promise<void> {
    // OANDA uses format: EUR_USD (not EUR/USD)
    const normalized = instruments.map((i) => i.replace('/', '_').toUpperCase());
    normalized.forEach((i) => this.subscribedInstruments.add(i));
    
    this.logger.log(`Subscribing to OANDA instruments: ${normalized.join(', ')}`);
    
    this.disconnect();
    await this.connect();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.activeRequest) {
      this.activeRequest.destroy?.();
      this.activeRequest = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      instruments: Array.from(this.subscribedInstruments),
      environment: this.OANDA_ENV,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: HTTP Streaming Connection
  // ─────────────────────────────────────────────────────────────────────────

  private async connect(): Promise<void> {
    if (this.subscribedInstruments.size === 0 || !this.API_KEY) {
      this.logger.warn('OANDA: No instruments or API key configured — skipping connection');
      return;
    }

    const baseUrl = this.OANDA_ENV === 'live'
      ? 'https://stream-fxtrade.oanda.com'
      : 'https://stream-fxpractice.oanda.com';

    const instruments = Array.from(this.subscribedInstruments).join(',');
    const url = `${baseUrl}/v3/accounts/${this.ACCOUNT_ID}/pricing/stream?instruments=${instruments}`;

    this.logger.log(`Connecting to OANDA stream: ${this.OANDA_ENV} environment`);

    try {
      const https = await import('https');
      const urlObj = new URL(url);

      const req = https.get(
        urlObj,
        {
          headers: {
            Authorization: `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            this.logger.error(`OANDA stream returned HTTP ${res.statusCode}`);
            this.scheduleReconnect();
            return;
          }

          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.logger.log('✅ OANDA stream connected');

          let buffer = '';

          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            
            // OANDA sends newline-delimited JSON
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                this.handleMessage(line.trim());
              }
            }
          });

          res.on('end', () => {
            this.isConnected = false;
            this.logger.warn('OANDA stream ended — reconnecting');
            this.scheduleReconnect();
          });

          res.on('error', (err) => {
            this.logger.error(`OANDA stream error: ${err.message}`);
            this.isConnected = false;
            this.scheduleReconnect();
          });
        },
      );

      req.on('error', (err) => {
        this.logger.error(`OANDA request error: ${err.message}`);
        this.scheduleReconnect();
      });

      this.activeRequest = req;
    } catch (err) {
      this.logger.error(`OANDA connect failed: ${(err as Error).message}`);
      this.scheduleReconnect();
    }
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw);
      
      if (msg.type === 'PRICE') {
        const instrument = msg.instrument as string; // EUR_USD
        const displaySymbol = instrument.replace('_', '/'); // EUR/USD

        const tick: MarketTick = {
          symbol: displaySymbol,
          exchange: 'oanda',
          price: msg.closeoutAsk ?? msg.asks?.[0]?.price ?? '0',
          volume: '0', // OANDA doesn't provide volume in streaming
          bid: msg.bids?.[0]?.price ?? '0',
          ask: msg.asks?.[0]?.price ?? '0',
          timestamp: new Date(msg.time).getTime(),
          assetClass: AssetClass.FOREX,
        };

        this.emit('tick', tick);
      }
      // HEARTBEAT messages are silently ignored
    } catch {
      // Silently skip malformed messages
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT) {
      this.logger.error('Max OANDA reconnect attempts reached');
      this.emit('max_reconnect_exceeded');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.logger.log(`Reconnecting to OANDA in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
