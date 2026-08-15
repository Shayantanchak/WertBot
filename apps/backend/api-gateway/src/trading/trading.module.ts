import { Module } from '@nestjs/common';
import { TradingController } from './trading.controller';

@Module({
  controllers: [TradingController],
})
export class TradingModule {}
