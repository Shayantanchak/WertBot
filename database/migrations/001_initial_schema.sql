-- =============================================================================
-- WertBot — PostgreSQL Initial Schema
-- Migration: 001_initial_schema.sql
-- ACID-Compliant Financial Ledger & AI Context Store
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fast text search

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification', 'closed');
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'investment', 'crypto', 'forex', 'wallet');
CREATE TYPE transaction_type AS ENUM ('debit', 'credit', 'transfer', 'trade', 'fee', 'refund');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled', 'reversed');
CREATE TYPE currency_code AS ENUM ('USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'BTC', 'ETH', 'USDT');
CREATE TYPE mfa_method AS ENUM ('totp', 'sms', 'email', 'biometric', 'hardware_key');
CREATE TYPE ai_session_type AS ENUM ('budget_advisor', 'investment_advisor', 'research', 'trading_signal', 'general');
CREATE TYPE card_network AS ENUM ('visa', 'mastercard', 'amex', 'discover', 'rupay');
CREATE TYPE order_side AS ENUM ('buy', 'sell');
CREATE TYPE order_status AS ENUM ('open', 'filled', 'partially_filled', 'cancelled', 'rejected');
CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop_loss', 'take_profit', 'trailing_stop');
CREATE TYPE asset_class AS ENUM ('crypto', 'forex', 'stock', 'etf', 'commodity');

-- =============================================================================
-- USERS TABLE
-- Core identity and authentication store
-- =============================================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               TEXT NOT NULL UNIQUE,
    phone               TEXT UNIQUE,
    full_name           TEXT NOT NULL,
    avatar_url          TEXT,
    status              user_status NOT NULL DEFAULT 'pending_verification',
    
    -- Encrypted PII (AES-256-GCM at application level)
    -- These columns store ciphertext:base64_encoded_iv:base64_encoded_tag
    pan_encrypted       TEXT,           -- Payment card number
    ssn_encrypted       TEXT,           -- Social Security Number (for US users)
    aadhar_encrypted    TEXT,           -- Aadhaar (for Indian users)
    
    -- Auth
    password_hash       TEXT,           -- bcrypt hash (for fallback auth)
    webauthn_credential JSONB,          -- WebAuthn credential IDs & public keys
    totp_secret_enc     TEXT,           -- Encrypted TOTP secret
    mfa_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_methods         mfa_method[],
    
    -- Metadata
    kyc_verified        BOOLEAN NOT NULL DEFAULT FALSE,
    kyc_verified_at     TIMESTAMPTZ,
    timezone            TEXT NOT NULL DEFAULT 'UTC',
    locale              TEXT NOT NULL DEFAULT 'en-US',
    preferences         JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ     -- Soft delete (GDPR)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

-- =============================================================================
-- ACCOUNTS TABLE
-- Financial accounts linked to a user (bank, crypto, wallet)
-- =============================================================================

CREATE TABLE accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_type        account_type NOT NULL,
    currency            currency_code NOT NULL DEFAULT 'USD',
    
    -- Balance stored in smallest unit (cents, paise, satoshi)
    balance_minor       BIGINT NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
    available_minor     BIGINT NOT NULL DEFAULT 0 CHECK (available_minor >= 0),
    
    -- External linkage (Plaid/Yodlee)
    plaid_account_id    TEXT UNIQUE,
    plaid_item_id       TEXT,
    institution_name    TEXT,
    mask                TEXT,           -- Last 4 digits of account
    
    -- Crypto wallet address (for crypto accounts)
    wallet_address_enc  TEXT,           -- Encrypted wallet address
    
    name                TEXT NOT NULL,
    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    metadata            JSONB NOT NULL DEFAULT '{}',
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_plaid_id ON accounts(plaid_account_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);

-- =============================================================================
-- TRANSACTIONS TABLE
-- Immutable financial ledger — every financial event recorded here
-- =============================================================================

CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    account_id          UUID NOT NULL REFERENCES accounts(id),
    
    transaction_type    transaction_type NOT NULL,
    status              transaction_status NOT NULL DEFAULT 'pending',
    
    -- Amount in minor units (e.g., 8500 = $85.00)
    amount_minor        BIGINT NOT NULL,
    currency            currency_code NOT NULL,
    
    -- For cross-currency transactions
    original_amount_minor   BIGINT,
    original_currency       currency_code,
    exchange_rate           NUMERIC(20, 10),
    
    -- Merchant & Categorization
    merchant_name       TEXT,
    merchant_mcc        TEXT,           -- Merchant Category Code (e.g., 5812 = restaurants)
    merchant_city       TEXT,
    merchant_country    TEXT,
    category            TEXT,
    subcategory         TEXT,
    
    -- References
    reference_id        TEXT,           -- External reference (bank ref, Plaid txn ID)
    counterpart_txn_id  UUID REFERENCES transactions(id),  -- For transfers
    
    -- SMS / Webhook source data
    source              TEXT,           -- 'plaid' | 'sms' | 'manual' | 'webhook'
    raw_sms_text        TEXT,           -- Original SMS text if scraped
    
    -- AI enrichment (JSONB for flexibility)
    ai_metadata         JSONB NOT NULL DEFAULT '{}',
    -- Example: { "card_recommendation": "Amex Gold", "budget_impact": "88%", "merchant_category": "dining" }
    
    description         TEXT,
    notes               TEXT,
    tags                TEXT[],
    
    -- For recurring transactions
    is_recurring        BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_pattern   TEXT,
    
    transaction_date    TIMESTAMPTZ NOT NULL,
    posted_date         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_merchant ON transactions USING gin(to_tsvector('english', COALESCE(merchant_name, '')));
CREATE INDEX idx_transactions_category ON transactions(category);

-- =============================================================================
-- CREDIT_CARDS TABLE
-- User's registered credit/debit cards for Card Intelligence Matrix
-- =============================================================================

CREATE TABLE credit_cards (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_name           TEXT NOT NULL,       -- e.g., "Amex Gold", "Chase Sapphire"
    card_network        card_network NOT NULL,
    issuer              TEXT,
    last_four           TEXT,
    expiry_month        SMALLINT,
    expiry_year         SMALLINT,
    
    -- Rewards & Perks stored as JSONB
    -- e.g., { "dining": 4, "groceries": 4, "travel": 3, "other": 1, "cashback_categories": ["gas"] }
    reward_categories   JSONB NOT NULL DEFAULT '{}',
    
    -- MCC-specific multipliers for Card Intelligence Matrix
    -- e.g., { "5812": 4, "5411": 4, "3000-3299": 3 }  (5812 = restaurants, 5411 = grocery)
    mcc_multipliers     JSONB NOT NULL DEFAULT '{}',
    
    annual_fee_minor    INTEGER NOT NULL DEFAULT 0,
    credit_limit_minor  BIGINT,
    
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);

-- =============================================================================
-- BUDGETS TABLE
-- Monthly/custom budget categories per user
-- =============================================================================

CREATE TABLE budgets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category            TEXT NOT NULL,
    amount_minor        BIGINT NOT NULL,
    currency            currency_code NOT NULL DEFAULT 'USD',
    period              TEXT NOT NULL DEFAULT 'monthly',    -- 'weekly' | 'monthly' | 'yearly'
    start_date          DATE NOT NULL,
    end_date            DATE,
    alert_threshold     NUMERIC(5,2) NOT NULL DEFAULT 80.0, -- Alert at 80% usage
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, category, period, start_date)
);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- =============================================================================
-- AI_CONTEXT_CACHE TABLE
-- Persistent AI conversation context and generated insights
-- Stores JSONB for flexibility — replaces separate MongoDB instance
-- =============================================================================

CREATE TABLE ai_context_cache (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type        ai_session_type NOT NULL,
    session_id          TEXT NOT NULL,
    
    -- Conversation messages stored as JSONB array
    messages            JSONB NOT NULL DEFAULT '[]',
    -- Example: [{ "role": "user", "content": "...", "timestamp": "..." }, ...]
    
    -- AI-generated insights & summaries
    insights            JSONB NOT NULL DEFAULT '{}',
    -- Example: { "monthly_summary": "...", "top_category": "dining", "savings_rate": 0.23 }
    
    -- Context window metadata
    token_count         INTEGER NOT NULL DEFAULT 0,
    model_used          TEXT NOT NULL DEFAULT 'gemini-2.5-pro',
    
    expires_at          TIMESTAMPTZ,        -- NULL = persistent session
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_context_user_id ON ai_context_cache(user_id);
CREATE INDEX idx_ai_context_session ON ai_context_cache(session_id);
CREATE INDEX idx_ai_context_type ON ai_context_cache(session_type);

-- =============================================================================
-- TRADING_ORDERS TABLE
-- HFT and manual trade order ledger
-- =============================================================================

CREATE TABLE trading_orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    account_id          UUID NOT NULL REFERENCES accounts(id),
    
    symbol              TEXT NOT NULL,          -- e.g., 'BTCUSDT', 'EUR/USD', 'AAPL'
    asset_class         asset_class NOT NULL,
    side                order_side NOT NULL,
    order_type          order_type NOT NULL,
    status              order_status NOT NULL DEFAULT 'open',
    
    -- Quantities in string to avoid float precision issues
    quantity            NUMERIC(30, 10) NOT NULL,
    filled_quantity     NUMERIC(30, 10) NOT NULL DEFAULT 0,
    
    -- Prices stored as NUMERIC for precision
    requested_price     NUMERIC(30, 10),
    executed_price      NUMERIC(30, 10),
    stop_price          NUMERIC(30, 10),
    
    -- P&L
    realized_pnl        NUMERIC(30, 10),
    fees_minor          BIGINT NOT NULL DEFAULT 0,
    
    -- Execution metadata
    exchange            TEXT NOT NULL,          -- 'binance' | 'coinbase' | 'oanda'
    exchange_order_id   TEXT,
    is_hft              BOOLEAN NOT NULL DEFAULT FALSE,
    algorithm           TEXT,                   -- Algorithm that placed this order
    
    -- AI signal that triggered this trade
    ai_signal           JSONB,
    -- Example: { "confidence": 0.87, "direction": "long", "model": "price_action_v2" }
    
    placed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    filled_at           TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON trading_orders(user_id);
CREATE INDEX idx_orders_symbol ON trading_orders(symbol);
CREATE INDEX idx_orders_status ON trading_orders(status);
CREATE INDEX idx_orders_placed_at ON trading_orders(placed_at DESC);

-- =============================================================================
-- MULTI_CURRENCY_WALLETS TABLE
-- Neobanking virtual wallets (Phase 4)
-- =============================================================================

CREATE TABLE multi_currency_wallets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency            currency_code NOT NULL,
    balance_minor       BIGINT NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
    reserved_minor      BIGINT NOT NULL DEFAULT 0 CHECK (reserved_minor >= 0),
    
    iban                TEXT,           -- For EUR wallets
    account_number      TEXT,           -- For USD wallets
    routing_number      TEXT,           -- For USD ACH transfers
    
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON multi_currency_wallets(user_id);

-- =============================================================================
-- WALLET_TRANSFERS TABLE
-- Neobanking virtual wallets transfers log (Phase 4)
-- =============================================================================

CREATE TABLE wallet_transfers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                TEXT NOT NULL, -- 'sent' | 'received' | 'convert'
    name                TEXT NOT NULL,
    amount              NUMERIC(20, 4) NOT NULL,
    currency            currency_code NOT NULL,
    date                TEXT NOT NULL,
    flag                TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_transfers_user_id ON wallet_transfers(user_id);
CREATE INDEX idx_wallet_transfers_created_at ON wallet_transfers(created_at DESC);

-- =============================================================================
-- DEVICE_SESSIONS TABLE
-- Track authenticated device sessions (for biometric & MFA management)
-- =============================================================================

CREATE TABLE device_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id           TEXT NOT NULL,
    device_name         TEXT,
    device_type         TEXT,           -- 'ios' | 'android' | 'web' | 'desktop'
    platform            TEXT,
    ip_address          INET,
    user_agent          TEXT,
    
    refresh_token_hash  TEXT NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    
    last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX idx_device_sessions_token ON device_sessions(refresh_token_hash);

-- =============================================================================
-- AUDIT_LOG TABLE
-- Immutable audit trail for compliance (PCI-DSS, GDPR, SOC 2)
-- =============================================================================

CREATE TABLE audit_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id),
    actor_ip            INET,
    actor_user_agent    TEXT,
    action              TEXT NOT NULL,      -- e.g., 'user.login', 'transaction.created', 'order.placed'
    resource_type       TEXT,               -- e.g., 'user', 'account', 'transaction'
    resource_id         TEXT,
    changes             JSONB,              -- Before/After state for sensitive changes
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- =============================================================================
-- AUTO-UPDATE TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_context_updated_at BEFORE UPDATE ON ai_context_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON trading_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON multi_currency_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallet_transfers_updated_at BEFORE UPDATE ON wallet_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA — MCC Category Lookup
-- =============================================================================

CREATE TABLE mcc_categories (
    mcc             TEXT PRIMARY KEY,
    category        TEXT NOT NULL,
    subcategory     TEXT,
    description     TEXT NOT NULL
);

INSERT INTO mcc_categories (mcc, category, subcategory, description) VALUES
('5411', 'groceries', 'supermarket', 'Grocery Stores and Supermarkets'),
('5422', 'groceries', 'meat', 'Freezer and Locker Meat Provisioners'),
('5441', 'groceries', 'candy', 'Candy, Nut and Confectionery Stores'),
('5451', 'groceries', 'dairy', 'Dairy Products Stores'),
('5461', 'groceries', 'bakery', 'Bakeries'),
('5812', 'dining', 'restaurant', 'Eating Places and Restaurants'),
('5813', 'dining', 'bar', 'Drinking Places (Alcoholic Beverages)'),
('5814', 'dining', 'fast_food', 'Fast Food Restaurants'),
('5912', 'health', 'pharmacy', 'Drug Stores and Pharmacies'),
('5999', 'shopping', 'retail', 'Miscellaneous and Specialty Retail Stores'),
('5541', 'automotive', 'gas', 'Service Stations (with or without Ancillary Services)'),
('4111', 'transport', 'transit', 'Local and Suburban Commuter Passenger Transportation'),
('4121', 'transport', 'taxi', 'Taxicabs and Limousines'),
('4411', 'travel', 'cruise', 'Cruise Lines'),
('4511', 'travel', 'airline', 'Airlines, Air Carriers'),
('7011', 'travel', 'hotel', 'Lodging - Hotels, Motels, Resorts'),
('4814', 'utilities', 'phone', 'Telecommunication Services'),
('4900', 'utilities', 'electricity', 'Utilities—Electric, Gas, Water, Sanitary'),
('5045', 'shopping', 'electronics', 'Computers, Computer Peripheral Equipment, Software'),
('5065', 'shopping', 'electronics', 'Electronic Parts and Equipment'),
('5732', 'shopping', 'electronics', 'Electronics Stores'),
('7941', 'entertainment', 'sports', 'Athletic Fields, Commercial Sports'),
('7832', 'entertainment', 'movies', 'Motion Picture Theaters'),
('7922', 'entertainment', 'events', 'Theatrical Ticket Agencies'),
('8011', 'health', 'doctor', 'Doctors and Physicians (Not Elsewhere Classified)'),
('8021', 'health', 'dental', 'Dentists, Orthodontists'),
('8049', 'health', 'optometry', 'Podiatrists and Chiropractors'),
('8099', 'health', 'medical', 'Health Practitioners—Medical Services'),
('8220', 'education', 'college', 'Colleges, Universities, Professional Schools, Junior Colleges'),
('8299', 'education', 'general', 'Schools and Educational Services'),
('6011', 'finance', 'atm', 'Automated Cash Disbursements'),
('6012', 'finance', 'banking', 'Member Financial Institutions');

-- =============================================================================
-- Done
-- =============================================================================
SELECT 'WertBot schema initialized successfully.' AS status;
