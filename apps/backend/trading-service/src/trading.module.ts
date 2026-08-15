import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BinanceStream } from './streams/binance.ws';
import { OandaStream } from './streams/oanda.ws';
import { TradingEngine } from './engine/trading.engine';
import { PricePredictorService } from './predictor/price-predictor.service';
import { PortfolioService } from './portfolio/portfolio.service';
import { RiskManagementService } from './risk/risk-management.service';
import { TradingController } from './trading.controller';
import { TradingGateway } from './websocket/trading.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
  ],
  controllers: [TradingController],
  providers: [
    BinanceStream,
    OandaStream,
    TradingEngine,
    PricePredictorService,
    PortfolioService,
    RiskManagementService,
    TradingGateway,
  ],
  exports: [
    TradingEngine,
    PricePredictorService,
    PortfolioService,
    RiskManagementService,
  ],
})
export class TradingModule {}
