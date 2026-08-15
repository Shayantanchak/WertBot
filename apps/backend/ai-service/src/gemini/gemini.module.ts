import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { AiContextEntity } from '../database/entities/ai-context.entity';
import { MarketNewsService } from '../research/market-news.service';
import { ChatRouterService } from '../routing/chat-router.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiContextEntity])],
  controllers: [GeminiController],
  providers: [GeminiService, MarketNewsService, ChatRouterService],
  exports: [GeminiService, MarketNewsService, ChatRouterService],
})
export class GeminiModule {}
