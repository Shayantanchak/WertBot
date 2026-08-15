export declare enum UserRole {
    USER = "user",
    PREMIUM = "premium",
    ADMIN = "admin",
    INSTITUTIONAL = "institutional"
}
export declare enum AccountType {
    CHECKING = "checking",
    SAVINGS = "savings",
    INVESTMENT = "investment",
    CRYPTO = "crypto",
    FOREX = "forex"
}
export declare enum TransactionType {
    DEBIT = "debit",
    CREDIT = "credit",
    TRANSFER = "transfer"
}
export declare enum TransactionStatus {
    PENDING = "pending",
    POSTED = "posted",
    CANCELLED = "cancelled",
    FAILED = "failed"
}
export declare enum CurrencyCode {
    USD = "USD",
    EUR = "EUR",
    GBP = "GBP",
    INR = "INR",
    JPY = "JPY",
    AUD = "AUD",
    CAD = "CAD",
    CHF = "CHF",
    SGD = "SGD",
    BTC = "BTC",
    ETH = "ETH",
    USDT = "USDT"
}
export declare enum AssetClass {
    CRYPTO = "crypto",
    FOREX = "forex",
    EQUITY = "equity",
    BOND = "bond",
    COMMODITY = "commodity"
}
export declare enum AiSessionType {
    BUDGET_ADVISOR = "budget_advisor",
    INVESTMENT_ADVISOR = "investment_advisor",
    RESEARCH = "research",
    TRADING_SIGNAL = "trading_signal",
    GENERAL = "general"
}
export declare enum OrderSide {
    BUY = "buy",
    SELL = "sell"
}
export declare enum OrderType {
    MARKET = "market",
    LIMIT = "limit",
    STOP_LOSS = "stop_loss",
    TAKE_PROFIT = "take_profit"
}
export declare enum OrderStatus {
    PENDING = "pending",
    OPEN = "open",
    FILLED = "filled",
    CANCELLED = "cancelled",
    REJECTED = "rejected"
}
export declare enum NotificationType {
    BUDGET_ALERT = "budget_alert",
    LARGE_TRANSACTION = "large_transaction",
    UNUSUAL_ACTIVITY = "unusual_activity",
    AI_INSIGHT = "ai_insight",
    TRADING_SIGNAL = "trading_signal",
    PRICE_ALERT = "price_alert"
}
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
    balanceMinor: number;
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
    amountMinor: number;
    currency: CurrencyCode;
    merchantName?: string;
    merchantMcc?: string;
    merchantCity?: string;
    merchantCountry?: string;
    category?: string;
    subcategory?: string;
    referenceId?: string;
    source: string;
    transactionDate: Date;
    postedDate?: Date;
    isRecurring: boolean;
    aiMetadata: Record<string, unknown>;
    createdAt: Date;
}
export interface Budget {
    id: string;
    userId: string;
    category: string;
    limitMinor: number;
    spentMinor: number;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    alertThresholdPct: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreditCard {
    id: string;
    userId: string;
    cardName: string;
    issuer: string;
    cardNetwork: string;
    lastFour?: string;
    rewardCategories: Record<string, number>;
    mccMultipliers: Record<string, number>;
    annualFeeMinor: number;
    isActive: boolean;
    isPrimary: boolean;
}
export interface RewardStructure {
    mccCategory: string;
    mccCodes?: string[];
    rewardRate: number;
    rewardType: string;
    rewardProgram: string;
    capMonthlyMinor?: number;
}
export interface CardRecommendation {
    cardId: string;
    cardName: string;
    issuer: string;
    rewardRate: number;
    rewardType: string;
    rewardProgram: string;
    estimatedReward: number;
    reasoning: string;
}
export interface MarketTick {
    symbol: string;
    exchange: string;
    price: string;
    volume: string;
    bid?: string;
    ask?: string;
    timestamp: number;
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
export declare const KAFKA_TOPICS: {
    readonly TRANSACTION_CREATED: "wertbot.transaction.created";
    readonly TRANSACTION_UPDATED: "wertbot.transaction.updated";
    readonly BUDGET_ALERT: "wertbot.budget.alert";
    readonly AI_ENRICHMENT_REQUEST: "wertbot.ai.enrichment.request";
    readonly AI_ENRICHMENT_DONE: "wertbot.ai.enrichment.done";
    readonly TRADING_ORDER_PLACED: "wertbot.trading.order.placed";
    readonly TRADING_ORDER_FILLED: "wertbot.trading.order.filled";
    readonly NOTIFICATION_PUSH: "wertbot.notification.push";
};
export declare const GRPC_SERVICES: {
    readonly AUTH: "wertbot.auth.AuthService";
    readonly TRANSACTION: "wertbot.transaction.TransactionService";
    readonly TRADING: "wertbot.trading.TradingService";
};
//# sourceMappingURL=index.d.ts.map