import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VertexAI,
  GenerativeModel,
  Content,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
} from '@google-cloud/vertexai';
import { AiMessage, AiSessionType } from '@wertbot/shared-types';
import { AiContextEntity } from '../database/entities/ai-context.entity';

// =============================================================================
// System Prompts for each advisor persona
// =============================================================================

const SYSTEM_PROMPTS: Record<AiSessionType, string> = {
  [AiSessionType.BUDGET_ADVISOR]: `You are WertBot Budget Advisor, an expert personal finance coach.
You help users track spending, optimize budgets, and understand their financial habits.
Always be specific with numbers, provide actionable insights, and speak in a warm, encouraging tone.`,

  [AiSessionType.INVESTMENT_ADVISOR]: `You are WertBot Investment Advisor, a sophisticated portfolio optimization expert.
You analyze market conditions, risk tolerance, and portfolio composition to provide tailored investment strategies.`,

  [AiSessionType.RESEARCH]: `You are WertBot Research Analyst, trained on institutional-grade financial research.
You synthesize market data, earnings reports, analyst ratings, and macroeconomic trends.`,

  [AiSessionType.TRADING_SIGNAL]: `You are WertBot Trading Signal Engine.
Analyze price action, technical indicators (RSI, MACD, Bollinger Bands), and volume profiles.`,

  [AiSessionType.GENERAL]: `You are WertBot, a world-class AI financial co-pilot.
You help users with all aspects of personal finance: budgeting, investing, trading, banking, and financial planning.`,

  // ── 1. Daily Finance & Minimal Spending Advisor (agent-pfm-advisor) ───────────────
  [AiSessionType.BUDGET_PFM]: `You are WertBot PFM Advisor (agent-pfm-advisor), an expert global personal finance manager.
Your goal is to analyze daily micro-transactions, detect overspending patterns across dining, travel, and lifestyle, and recommend real-time strategies to minimize daily expenses globally.
You possess global knowledge of cost-of-living benchmarks, multi-currency purchasing power, and budget optimization across regions (Americas, EMEA, APAC).`,

  // ── 2. Global Card Concierge & Perks Optimizer (agent-card-concierge) ──────────────
  [AiSessionType.CARD_CONCIERGE]: `You are WertBot Card Concierge (agent-card-concierge), a world-class credit/debit card intelligence agent.
You possess global knowledge of cards across networks (Visa, Mastercard, Amex, Diners Club, RuPay).
Your functions:
1. In-Transaction Card Picker: Match vendor Merchant Category Codes (MCC) against the user's card portfolio to maximize cashback, reward points, lounge access, and movie perks for every purchase.
2. Global Card Recommendation Engine: Suggest the highest-value credit/debit cards globally based on user spending habits and region.
3. Card Portfolio Input Handling: Parse card details supplied by users and identify all built-in perks.`,

  // ── 3. Macro Wealth, Trading & Investment Strategist (agent-quant-advisor) ────────
  [AiSessionType.GLOBAL_WEALTH]: `You are WertBot Quant Advisor (agent-quant-advisor), an institutional macro wealth analyst and algorithmic investment strategist.
You provide asset allocation strategies across global equities, fixed income (FDs/bonds), mutual funds, SIPs, Forex, and Crypto.
You integrate real-time macroeconomic news, central bank policies (Fed, ECB, BoE, RBI, BoJ), global interest rate trends, and technical price indicators to deliver actionable investment recommendations.`,

  // ── 4. Market Intelligence & Research Engine (agent-market-research) ───────────────
  [AiSessionType.MARKET_RESEARCH]: `You are WertBot Market Research Engine (agent-market-research).
You perform deep-dive analysis into company fundamentals, SEC filings (10-K, 10-Q), earnings transcripts, macro sentiment, valuation multiples (P/E, EV/EBITDA, P/FCF), and global current affairs.`,
};

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly vertexAI: VertexAI;
  private readonly modelId: string;

  // Safety settings — relaxed for financial context (no violence/harassment, but allow financial risk discussion)
  private readonly safetySettings: SafetySetting[] = [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AiContextEntity)
    private readonly aiContextRepo: Repository<AiContextEntity>,
  ) {
    this.vertexAI = new VertexAI({
      project: this.configService.get<string>('GOOGLE_VERTEX_AI_PROJECT')!,
      location: this.configService.get<string>('GOOGLE_VERTEX_AI_LOCATION', 'us-central1'),
    });
    this.modelId = this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-pro');
    this.logger.log(`Gemini AI initialized with model: ${this.modelId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper for Router service
  // ─────────────────────────────────────────────────────────────────────────

  async generateResponse(params: {
    userId: string;
    sessionType: AiSessionType;
    prompt: string;
    contextOverride?: Record<string, unknown>;
  }): Promise<{ response: string; tokensUsed: number }> {
    return this.chat({
      userId: params.userId,
      sessionType: params.sessionType,
      messages: [],
      userContext: params.contextOverride,
      userMessage: params.prompt,
      sessionId: `session_${params.userId}_${params.sessionType}`,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Chat Method — Stateless with external context injection & DB cache
  // ─────────────────────────────────────────────────────────────────────────

  async chat(params: {
    sessionType: AiSessionType;
    messages: AiMessage[];
    userContext?: Record<string, unknown>;  // User's financial context
    userMessage: string;
    userId?: string;
    sessionId?: string;
  }): Promise<{ response: string; tokensUsed: number }> {
    const model = this.getModel(params.sessionType);

    // 1. Resolve conversation history (either passed in or loaded from DB)
    let historyMessages = params.messages || [];
    let dbSession: AiContextEntity | null = null;

    if (params.userId && params.sessionId) {
      dbSession = await this.aiContextRepo.findOne({
        where: {
          userId: params.userId,
          sessionType: params.sessionType,
          sessionId: params.sessionId,
        },
      });

      if (dbSession && historyMessages.length === 0) {
        historyMessages = dbSession.messages.map((m) => ({
          role: m.role === 'model' ? 'model' : 'user' as any,
          content: m.content,
          timestamp: new Date(Number(m.timestamp)),
        }));
      }
    }

    // Build history for Gemini SDK
    const history: Content[] = historyMessages.map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Inject financial context into user message if available
    let enhancedMessage = params.userMessage;
    if (params.userContext && Object.keys(params.userContext).length > 0) {
      enhancedMessage = `[FINANCIAL CONTEXT]\n${JSON.stringify(params.userContext, null, 2)}\n\n[USER MESSAGE]\n${params.userMessage}`;
    }

    try {
      const chat = model.startChat({
        history,
        safetySettings: this.safetySettings,
      });

      const result = await chat.sendMessage(enhancedMessage);
      const response = result.response;

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;

      this.logger.debug(`Gemini response: ${tokensUsed} tokens used`);

      // 2. Persist new messages to DB cache if enabled
      if (params.userId && params.sessionId) {
        const newMessagesJson = [
          ...historyMessages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.getTime().toString(),
          })),
          {
            role: 'user',
            content: params.userMessage, // Save clean message, not context-injected
            timestamp: Date.now().toString(),
          },
          {
            role: 'model',
            content: text,
            timestamp: Date.now().toString(),
          },
        ];

        if (dbSession) {
          dbSession.messages = newMessagesJson;
          await this.aiContextRepo.save(dbSession);
        } else {
          const newSession = this.aiContextRepo.create({
            userId: params.userId,
            sessionType: params.sessionType,
            sessionId: params.sessionId,
            messages: newMessagesJson,
            insights: {},
          });
          await this.aiContextRepo.save(newSession);
        }
      }

      return { response: text, tokensUsed };
    } catch (error) {
      this.logger.error(`Gemini API error: ${(error as Error).message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Single-shot generation (no history) — for AI enrichment pipelines
  // ─────────────────────────────────────────────────────────────────────────

  async generate(prompt: string, sessionType: AiSessionType = AiSessionType.GENERAL): Promise<string> {
    const model = this.getModel(sessionType);

    try {
      const result = await model.generateContent(prompt);
      return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (error) {
      this.logger.error(`Gemini generate error: ${(error as Error).message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transaction Enrichment — Categorize and extract metadata from a transaction
  // ─────────────────────────────────────────────────────────────────────────

  async enrichTransaction(params: {
    merchantName: string;
    merchantMcc?: string;
    amountMinor: number;
    currency: string;
    rawSmsText?: string;
  }): Promise<{
    category: string;
    subcategory: string;
    merchantType: string;
    isRecurring: boolean;
    geminiSummary: string;
  }> {
    const prompt = `
Analyze this financial transaction and return a JSON object with these exact fields:
{
  "category": string (one of: groceries, dining, transport, entertainment, health, utilities, shopping, travel, education, finance, other),
  "subcategory": string (specific subcategory),
  "merchantType": string (type of merchant business),
  "isRecurring": boolean (true if this looks like a subscription or recurring payment),
  "geminiSummary": string (one sentence describing this transaction naturally)
}

Transaction details:
- Merchant: ${params.merchantName}
- MCC Code: ${params.merchantMcc ?? 'unknown'}
- Amount: ${params.amountMinor / 100} ${params.currency}
${params.rawSmsText ? `- SMS Text: ${params.rawSmsText}` : ''}

Return ONLY valid JSON, no markdown.`;

    try {
      const raw = await this.generate(prompt, AiSessionType.GENERAL);
      return JSON.parse(raw.trim());
    } catch {
      this.logger.warn(`Transaction enrichment failed for: ${params.merchantName}`);
      return {
        category: 'other',
        subcategory: 'general',
        merchantType: 'unknown',
        isRecurring: false,
        geminiSummary: `Payment of ${params.amountMinor / 100} ${params.currency} to ${params.merchantName}`,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Budget Alert Message Generation
  // ─────────────────────────────────────────────────────────────────────────

  async generateBudgetAlert(params: {
    category: string;
    percentageUsed: number;
    budgetAmountMinor: number;
    spentMinor: number;
    currency: string;
    bestCardName?: string;
    cashbackEstimate?: number;
  }): Promise<string> {
    const prompt = `
Generate a SHORT, friendly push notification message (max 120 characters) for a budget alert:
- Category: ${params.category}
- Budget: ${params.budgetAmountMinor / 100} ${params.currency}
- Spent: ${params.spentMinor / 100} ${params.currency} (${params.percentageUsed.toFixed(0)}%)
${params.bestCardName ? `- Card tip: Use ${params.bestCardName} for ${params.cashbackEstimate}% back` : ''}

Return ONLY the notification text, no quotes.`;

    return this.generate(prompt);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Get configured GenerativeModel for a session type
  // ─────────────────────────────────────────────────────────────────────────

  private getModel(sessionType: AiSessionType): GenerativeModel {
    return this.vertexAI.getGenerativeModel({
      model: this.modelId,
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPTS[sessionType] }],
      },
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: sessionType === AiSessionType.TRADING_SIGNAL ? 0.1 : 0.7,
        topP: 0.8,
        topK: 40,
      },
    });
  }
}
