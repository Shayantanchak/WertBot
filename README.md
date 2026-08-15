# WertBot & ApexValuation Suite

WertBot is an API-first financial engineering monorepo designed for personal finance management, credit card reward intelligence, institutional stock valuation, and multi-agent AI advisory. The platform combines PostgreSQL 16 ACID compliance, worker thread event-loop offloading, integer minor-unit financial accounting, and a dynamic context router powered by Vertex AI.

---

## Technical Architecture Overview

The system is structured as a TypeScript monorepo using npm workspaces. Each service is decoupled and communicates over REST, gRPC, and asynchronous event streams.

```
wertbot/
├── apps/
│   ├── web/                     # React 18, Vite, TailwindCSS, Recharts
│   ├── backend/
│   │   ├── api-gateway/         # NestJS Gateway, Auth, Idempotency Middleware
│   │   ├── pfm-service/         # PFM Ledger, MCC Matrix & Card Intelligence Engine
│   │   ├── ai-service/          # Gemini 2.5 Pro, Persona Router & Market News
│   │   ├── banking-service/     # Open Banking Webhooks & SMS Fallback Ingress
│   │   └── trading-service/     # HFT Engine, Worker Threads, Price Streams
├── libs/
│   ├── shared-types/            # Shared DTOs, Enums, and Domain Interfaces
│   └── proto/                   # gRPC Protocol Buffer definitions
├── database/
│   ├── migrations/              # SQL Migrations (001_initial, 002_idempotency)
│   └── scripts/                 # Migration runner and database seeders
└── infra/
    └── docker/                  # PostgreSQL 16 & Redis infrastructure setup
```

---

## Phase 1 Implementation Summary

Phase 1 establishes the core infrastructure, financial ledger integrity, real-time data ingress drivers, multi-agent AI router, and valuation UI components.

### 1. Financial Ledger & Minor Currency Unit Accounting
To eliminate IEEE-754 double-precision floating-point precision errors (e.g., 0.1 + 0.2 balance drift), all currency values across PostgreSQL tables, APIs, and microservices are handled strictly in integer minor units (e.g., $10.50 is stored and processed as 1050 cents).
- Ledger columns: `balance_minor`, `amount_minor`, `limit_minor`, `fees_minor`.
- Database schema: PostgreSQL 16 with native JSONB columns for flexible AI context caching, replacing dual-database dependencies.

### 2. Real-Time Transaction Ingress (Open Banking & Fallback)
- Primary Ingress Driver: Plaid and PSD2 Open Banking Webhooks (`/banking/webhooks/open-banking`).
- Secondary Fallback: Android SMS transaction scraping endpoint (`/banking/transactions/sms-scrape`).
- Ingress Pipeline: Incoming payloads are parsed, assigned Merchant Category Codes (MCC), converted into integer minor units, and emitted to transaction processing queues.

### 3. Security, Replay Protection & Audit Trails
- Idempotency Middleware: Evaluates `Idempotency-Key` HTTP headers on all POST/PUT payment and trade routes to prevent double-charging during network retries.
- Immutable Audit Logging: Captures every transaction modification, trade execution, and AI prompt request in an immutable `audit_log` PostgreSQL table with client IP, timestamp, and metadata tracing.
- Passwordless WebAuthn / Passkey Authentication: Support for hardware-backed biometrics (Touch ID, Face ID, Windows Hello) alongside fallback JWT auth.

### 4. Single-Thread Event Loop Offloading
High-frequency quantitative calculations (RSI, MACD, Bollinger Bands, Order-Book Delta) are offloaded from Node.js single-threaded event loop to dedicated `worker_threads` (`analysis.worker.js`).
- Target Latency: Sub-50ms execution from market tick ingestion to technical signal generation.

### 5. Multi-Agent AI Orchestration System
Replaced external proprietary brand names with domain-scoped microservice personas, routed centrally via `ChatRouterService` in `ai-service`:

| Agent Persona | Identifier | Core Technical Scope |
|---|---|---|
| Daily PFM Advisor | `agent-pfm-advisor` | Tracks micro-transactions, analyzes burn rates, compares expenses against global cost-of-living benchmarks. |
| Card Concierge | `agent-card-concierge` | Matches vendor MCC codes against user card portfolios to optimize cashback, points, lounge access, and movie perks. Handles card portfolio inputs and global card picks. |
| Global Quant Advisor | `agent-quant-advisor` | Formulates asset allocation across Fixed Deposits (FDs), SIPs, Mutual Funds, Forex, and Crypto using live central bank policy updates. |
| Market Research Engine | `agent-market-research` | Institutional search across company filings (10-K, 10-Q), earnings call transcripts, and valuation multiples. |

### 6. Interactive Frontend Components & Valuation Suite
- Valuation Football Field Chart: Renders 52-Week Range, DCF Intrinsic Fair Value, Analyst Targets, Comps Multiples, and LBO Floor on a horizontal range visualization against current market price.
- Dynamic Formula Excel Export: Export utility generating native spreadsheet formulas (`=SUM(...)`, `=AVERAGE(...)`) for financial auditability.

---

## Local Setup & Development Instructions

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL 16 (or Docker Compose)
- npm 10.x


---

## Roadmap & Future Expansion

### Phase 2: Mobile Ecosystem & Real-Time Push Ingress
- Cross-Platform Mobile Application: Develop native mobile clients for iOS and Android using Flutter / React Native.
- Real-Time Push Notification Engine: Implement Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs) for actionable 1-tap alerts (e.g., instant card swipe recommendation when entering a restaurant).
- Direct Brokerage OAuth Integration: Direct API integration with Alpaca, Interactive Brokers, and Plaid Investments for automated portfolio synchronization.
- Hardware WebAuthn Authenticator: Native FIDO2 / Passkey registration flow stored in device Secure Enclave / Keystore.

### Phase 3: Neobanking Wallets & Institutional Execution
- Multi-Currency Virtual Wallets: Issue virtual IBANs for EUR transfers and ACH routing numbers for USD accounts.
- Institutional Order Execution: Integration of FIX protocol (Financial Information eXchange) for direct market access (DMA) across crypto and equities.
- Predictive Machine Learning Models: Train local risk and churn prediction models on historical user spend patterns to proactively optimize capital allocation.
