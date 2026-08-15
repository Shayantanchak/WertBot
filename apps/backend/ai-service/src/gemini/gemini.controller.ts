import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GeminiService } from './gemini.service';
import { AiSessionType, AiMessage } from '@wertbot/shared-types';

// =============================================================================
// WertBot — Gemini AI gRPC Controller
// Exposes conversational, transaction enrichment, and alert generation APIs
// =============================================================================

@Controller()
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @GrpcMethod('AiService', 'Chat')
  async chat(data: {
    sessionType: string;
    messages: Array<{ role: string; content: string; timestamp: string }>;
    userMessage: string;
    userContextJson?: string;
    userId: string;
    sessionId: string;
  }) {
    const messages: AiMessage[] = (data.messages || []).map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      content: m.content,
      timestamp: new Date(Number(m.timestamp || Date.now())),
    }));

    let userContext: Record<string, unknown> | undefined;
    if (data.userContextJson) {
      try {
        userContext = JSON.parse(data.userContextJson);
      } catch {
        userContext = undefined;
      }
    }

    const res = await this.geminiService.chat({
      sessionType: data.sessionType as AiSessionType,
      messages,
      userMessage: data.userMessage,
      userContext,
      userId: data.userId,
      sessionId: data.sessionId,
    });

    return {
      response: res.response,
      tokensUsed: res.tokensUsed,
    };
  }

  @GrpcMethod('AiService', 'EnrichTransaction')
  async enrichTransaction(data: {
    merchantName: string;
    merchantMcc?: string;
    amountMinor: string;
    currency: string;
    rawSmsText?: string;
  }) {
    const res = await this.geminiService.enrichTransaction({
      merchantName: data.merchantName,
      merchantMcc: data.merchantMcc,
      amountMinor: Number(data.amountMinor),
      currency: data.currency,
      rawSmsText: data.rawSmsText,
    });

    return {
      category: res.category,
      subcategory: res.subcategory,
      merchantType: res.merchantType,
      isRecurring: res.isRecurring,
      geminiSummary: res.geminiSummary,
    };
  }

  @GrpcMethod('AiService', 'GenerateBudgetAlert')
  async generateBudgetAlert(data: {
    category: string;
    percentageUsed: number;
    budgetAmountMinor: string;
    spentMinor: string;
    currency: string;
    bestCardName?: string;
    cashbackEstimate?: number;
  }) {
    const msg = await this.geminiService.generateBudgetAlert({
      category: data.category,
      percentageUsed: data.percentageUsed,
      budgetAmountMinor: Number(data.budgetAmountMinor),
      spentMinor: Number(data.spentMinor),
      currency: data.currency,
      bestCardName: data.bestCardName,
      cashbackEstimate: data.cashbackEstimate,
    });

    return {
      alertMessage: msg,
    };
  }
}
