-- =============================================================================
-- WertBot — Migration 002: Idempotency, Audit Trail & AI Enum Enhancements
-- PostgreSQL 16 ACID-Compliant Financial Ledger & Security Update
-- =============================================================================

-- Update AI Session Types enum to match generic domain agent personas
ALTER TYPE ai_session_type ADD VALUE IF NOT EXISTS 'budget_pfm';
ALTER TYPE ai_session_type ADD VALUE IF NOT EXISTS 'card_concierge';
ALTER TYPE ai_session_type ADD VALUE IF NOT EXISTS 'global_wealth';
ALTER TYPE ai_session_type ADD VALUE IF NOT EXISTS 'market_research';

-- =============================================================================
-- IDEMPOTENCY_KEYS TABLE
-- Replay protection for all monetary transactions & payment routes
-- =============================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key                 TEXT PRIMARY KEY,
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    request_path        TEXT NOT NULL,
    response_code       INTEGER NOT NULL,
    response_body       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_user_id ON idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- Add index on audit_log if missing
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
