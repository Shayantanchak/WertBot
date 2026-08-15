import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { RedisModule } from '@nestjs-modules/ioredis';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AiModule } from './ai/ai.module';
import { TradingModule } from './trading/trading.module';
import { WalletModule } from './wallet/wallet.module';

// =============================================================================
// WertBot — API Gateway Root Module
// =============================================================================

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal:   true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // ── Redis ─────────────────────────────────────────────────────────────
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: `redis://:${config.get('REDIS_PASSWORD')}@${config.get('REDIS_HOST', 'localhost')}:${config.get('REDIS_PORT', 6379)}`,
      }),
    }),

    // ── Rate Limiting (Redis-backed) ───────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          { name: 'short',  ttl: 1000,  limit: 10 },  // 10 req/s
          { name: 'medium', ttl: 60000, limit: 200 },  // 200 req/min
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD'),
          }),
        ),
      }),
    }),

    // ── Feature Modules ───────────────────────────────────────────────────
    DatabaseModule,
    AuthModule,
    TransactionsModule,
    AiModule,
    TradingModule,
    WalletModule,
  ],
})
export class AppModule {}
