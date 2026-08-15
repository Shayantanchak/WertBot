// =============================================================================
// WertBot — Shared Types, Interfaces, Enums, and DTOs
// Used across all microservices and the web/mobile frontends
// Package: @wertbot/shared-types
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export enum UserRole {
  USER          = 'user',
  PREMIUM       = 'premium',
  ADMIN         = 'admin',
  INSTITUTIONAL = 'institutional',
}

export enum AccountType {
  CHECKING   = 'checking',
  SAVINGS    = 'savings',
  INVESTMENT = 'investment',
  CRYPTO     = 'crypto',
  FOREX      = 'forex',
}

export enum TransactionType {
  DEBIT   = 'debit',
  CREDIT  = 'credit',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING   = 'pending',
  POSTED    = 'posted',
  CANCELLED = 'cancelled',
  FAILED    = 'failed',
}

export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  INR = 'INR',
  JPY = 'JPY',
  AUD = 'AUD',
  CAD = 'CAD',
  CHF = 'CHF',
  SGD = 'SGD',
  BTC = 'BTC',
  ETH = 'ETH',
  USDT = 'USDT',
}

export enum AssetClass {
  CRYPTO  = 'crypto',
  FOREX   = 'forex',
  EQUITY  = 'equity',
  BOND    = 'bond',
  COMMODITY = 'commodity',
}

export enum AiSessionType {
  BUDGET_ADVISOR      = 'budget_advisor',
  INVESTMENT_ADVISOR  = 'investment_advisor',
  RESEARCH            = 'research',
  TRADING_SIGNAL      = 'trading_signal',
  GENERAL             = 'general',
  // Domain Microservice Agent Personas
  BUDGET_PFM          = 'budget_pfm',          // agent-pfm-advisor (Daily PFM & minimal spending)
  CARD_CONCIERGE      = 'card_concierge',      // agent-card-concierge (Card reward & MCC optimizer)
  GLOBAL_WEALTH       = 'global_wealth',       // agent-quant-advisor (FDs, Mutual Funds, SIPs, Forex, Crypto)
  MARKET_RESEARCH     = 'market_research',     // agent-market-research (Company & macro research)
}

export enum OrderSide {
  BUY  = 'buy',
  SELL = 'sell',
}

export enum OrderType {
  MARKET     = 'market',
  LIMIT      = 'limit',
  STOP_LOSS  = 'stop_loss',
  TAKE_PROFIT = 'take_profit',
}

export enum OrderStatus {
  PENDING   = 'pending',
  OPEN      = 'open',
  FILLED    = 'filled',
  CANCELLED = 'cancelled',
  REJECTED  = 'rejected',
}

export enum NotificationType {
  BUDGET_ALERT         = 'budget_alert',
  LARGE_TRANSACTION    = 'large_transaction',
  UNUSUAL_ACTIVITY     = 'unusual_activity',
  AI_INSIGHT           = 'ai_insight',
  TRADING_SIGNAL       = 'trading_signal',
  PRICE_ALERT          = 'price_alert',
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Domain Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  isEmailVerified: boolean;
  isMfaEnabled: boolean;
  mfaSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  accountType: AccountType;
  currency: CurrencyCode;
  balanceMinor: number;     // Store as integer minor units (e.g., cents for USD)
  availableMinor: number;
  plaidAccountId?: string;
  plaidItemId?: string;
  mask?: string;
  name: string;
  institutionName?: string;
  isPrimary: boolean;
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  amountMinor: number;       // Positive integer, minor units
  currency: CurrencyCode;
  merchantName?: string;
  merchantMcc?: string;      // Merchant Category Code
  merchantCity?: string;
  merchantCountry?: string;
  category?: string;         // AI-enriched category
  subcategory?: string;
  referenceId?: string;
  source: string;            // 'plaid' | 'sms' | 'manual' | 'api'
  transactionDate: Date;
  postedDate?: Date;
  isRecurring: boolean;
  aiMetadata: Record<string, unknown>;  // AI enrichment JSONB
  createdAt: Date;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limitMinor: number;
  spentMinor: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  alertThresholdPct: number; // 0–100, alert fires when (spent/limit) >= threshold
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCard {
  id: string;
  userId: string;
  cardName: string;
  issuer: string;            // 'amex' | 'chase' | 'citi' | 'discover' | 'capitalone'
  cardNetwork: string;       // 'visa' | 'mastercard' | 'amex' | 'discover'
  lastFour?: string;
  rewardCategories: Record<string, number>;
  mccMultipliers: Record<string, number>;
  annualFeeMinor: number;
  isActive: boolean;
  isPrimary: boolean;
}

export interface RewardStructure {
  mccCategory: string;       // 'dining' | 'travel' | 'groceries' | 'gas' | 'default'
  mccCodes?: string[];       // Specific MCC codes (e.g., ['5812', '5813'])
  rewardRate: number;        // Multiplier, e.g., 4.0 = 4x points
  rewardType: string;        // 'points' | 'cashback' | 'miles'
  rewardProgram: string;     // 'MR' | 'UR' | 'TYP' | 'cashback'
  capMonthlyMinor?: number;  // Monthly cap in minor units (null = unlimited)
}

export interface CardRecommendation {
  cardId: string;
  cardName: string;
  issuer: string;
  rewardRate: number;
  rewardType: string;
  rewardProgram: string;
  estimatedReward: number;   // Reward value for this specific transaction
  reasoning: string;
}

export interface MarketTick {
  symbol: string;
  exchange: string;
  price: string;
  volume: string;
  bid?: string;
  ask?: string;
  timestamp: number;         // Unix ms
  assetClass: AssetClass;
}

export interface TradingOrder {
  id: string;
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  exchange: string;
  quantityMinor: number;
  filledQuantityMinor: number;
  limitPrice?: string;
  stopPrice?: string;
  avgFillPrice?: string;
  feeMinor: number;
  feeCurrency: CurrencyCode;
  externalOrderId?: string;
  placedAt: Date;
  filledAt?: Date;
}

export interface AiMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface AiSession {
  id: string;
  userId: string;
  sessionType: AiSessionType;
  messages: AiMessage[];
  contextMetadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// API DTOs (Request/Response shapes)
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  deviceId?: string;
  totpCode?: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface MfaSetupResponseDto {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface MfaVerifyDto {
  totpCode: string;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  timestamp: string;
  requestId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kafka Topic Names (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────

export const KAFKA_TOPICS = {
  TRANSACTION_CREATED:   'wertbot.transaction.created',
  TRANSACTION_UPDATED:   'wertbot.transaction.updated',
  BUDGET_ALERT:          'wertbot.budget.alert',
  AI_ENRICHMENT_REQUEST: 'wertbot.ai.enrichment.request',
  AI_ENRICHMENT_DONE:    'wertbot.ai.enrichment.done',
  TRADING_ORDER_PLACED:  'wertbot.trading.order.placed',
  TRADING_ORDER_FILLED:  'wertbot.trading.order.filled',
  NOTIFICATION_PUSH:     'wertbot.notification.push',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// gRPC Service Names
// ─────────────────────────────────────────────────────────────────────────────

export const GRPC_SERVICES = {
  AUTH:        'wertbot.auth.AuthService',
  TRANSACTION: 'wertbot.transaction.TransactionService',
  TRADING:     'wertbot.trading.TradingService',
} as const;

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId?: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial Valuation & Football Field Chart Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ValuationRange {
  methodology: string;        // e.g., 'DCF Fair Value', 'LBO Floor', '52-Week Range', 'Analyst Targets'
  min: number;
  max: number;
  base: number;
  color?: string;
}

export interface ValuationFootballFieldData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  ranges: ValuationRange[];
  currency: string;
  asOfDate: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Security & Idempotency Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IdempotencyRecord {
  key: string;
  userId: string;
  requestPath: string;
  responseCode: number;
  responseBody: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

export interface PasskeyCredentialOption {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  timeout: number;
}


