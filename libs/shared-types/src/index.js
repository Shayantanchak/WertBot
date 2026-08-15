"use strict";
// =============================================================================
// WertBot — Shared Types, Interfaces, Enums, and DTOs
// Used across all microservices and the web/mobile frontends
// Package: @wertbot/shared-types
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRPC_SERVICES = exports.KAFKA_TOPICS = exports.NotificationType = exports.OrderStatus = exports.OrderType = exports.OrderSide = exports.AiSessionType = exports.AssetClass = exports.CurrencyCode = exports.TransactionStatus = exports.TransactionType = exports.AccountType = exports.UserRole = void 0;
// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["PREMIUM"] = "premium";
    UserRole["ADMIN"] = "admin";
    UserRole["INSTITUTIONAL"] = "institutional";
})(UserRole || (exports.UserRole = UserRole = {}));
var AccountType;
(function (AccountType) {
    AccountType["CHECKING"] = "checking";
    AccountType["SAVINGS"] = "savings";
    AccountType["INVESTMENT"] = "investment";
    AccountType["CRYPTO"] = "crypto";
    AccountType["FOREX"] = "forex";
})(AccountType || (exports.AccountType = AccountType = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["DEBIT"] = "debit";
    TransactionType["CREDIT"] = "credit";
    TransactionType["TRANSFER"] = "transfer";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["POSTED"] = "posted";
    TransactionStatus["CANCELLED"] = "cancelled";
    TransactionStatus["FAILED"] = "failed";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var CurrencyCode;
(function (CurrencyCode) {
    CurrencyCode["USD"] = "USD";
    CurrencyCode["EUR"] = "EUR";
    CurrencyCode["GBP"] = "GBP";
    CurrencyCode["INR"] = "INR";
    CurrencyCode["JPY"] = "JPY";
    CurrencyCode["AUD"] = "AUD";
    CurrencyCode["CAD"] = "CAD";
    CurrencyCode["CHF"] = "CHF";
    CurrencyCode["SGD"] = "SGD";
    CurrencyCode["BTC"] = "BTC";
    CurrencyCode["ETH"] = "ETH";
    CurrencyCode["USDT"] = "USDT";
})(CurrencyCode || (exports.CurrencyCode = CurrencyCode = {}));
var AssetClass;
(function (AssetClass) {
    AssetClass["CRYPTO"] = "crypto";
    AssetClass["FOREX"] = "forex";
    AssetClass["EQUITY"] = "equity";
    AssetClass["BOND"] = "bond";
    AssetClass["COMMODITY"] = "commodity";
})(AssetClass || (exports.AssetClass = AssetClass = {}));
var AiSessionType;
(function (AiSessionType) {
    AiSessionType["BUDGET_ADVISOR"] = "budget_advisor";
    AiSessionType["INVESTMENT_ADVISOR"] = "investment_advisor";
    AiSessionType["RESEARCH"] = "research";
    AiSessionType["TRADING_SIGNAL"] = "trading_signal";
    AiSessionType["GENERAL"] = "general";
})(AiSessionType || (exports.AiSessionType = AiSessionType = {}));
var OrderSide;
(function (OrderSide) {
    OrderSide["BUY"] = "buy";
    OrderSide["SELL"] = "sell";
})(OrderSide || (exports.OrderSide = OrderSide = {}));
var OrderType;
(function (OrderType) {
    OrderType["MARKET"] = "market";
    OrderType["LIMIT"] = "limit";
    OrderType["STOP_LOSS"] = "stop_loss";
    OrderType["TAKE_PROFIT"] = "take_profit";
})(OrderType || (exports.OrderType = OrderType = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["OPEN"] = "open";
    OrderStatus["FILLED"] = "filled";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["REJECTED"] = "rejected";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["BUDGET_ALERT"] = "budget_alert";
    NotificationType["LARGE_TRANSACTION"] = "large_transaction";
    NotificationType["UNUSUAL_ACTIVITY"] = "unusual_activity";
    NotificationType["AI_INSIGHT"] = "ai_insight";
    NotificationType["TRADING_SIGNAL"] = "trading_signal";
    NotificationType["PRICE_ALERT"] = "price_alert";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// ─────────────────────────────────────────────────────────────────────────────
// Kafka Topic Names (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────
exports.KAFKA_TOPICS = {
    TRANSACTION_CREATED: 'wertbot.transaction.created',
    TRANSACTION_UPDATED: 'wertbot.transaction.updated',
    BUDGET_ALERT: 'wertbot.budget.alert',
    AI_ENRICHMENT_REQUEST: 'wertbot.ai.enrichment.request',
    AI_ENRICHMENT_DONE: 'wertbot.ai.enrichment.done',
    TRADING_ORDER_PLACED: 'wertbot.trading.order.placed',
    TRADING_ORDER_FILLED: 'wertbot.trading.order.filled',
    NOTIFICATION_PUSH: 'wertbot.notification.push',
};
// ─────────────────────────────────────────────────────────────────────────────
// gRPC Service Names
// ─────────────────────────────────────────────────────────────────────────────
exports.GRPC_SERVICES = {
    AUTH: 'wertbot.auth.AuthService',
    TRANSACTION: 'wertbot.transaction.TransactionService',
    TRADING: 'wertbot.trading.TradingService',
};
//# sourceMappingURL=index.js.map