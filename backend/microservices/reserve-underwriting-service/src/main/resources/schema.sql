CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS merchant_risk_profiles (
    merchant_id UUID PRIMARY KEY,
    mcc VARCHAR(4) NOT NULL,
    mcc_risk_tier VARCHAR(16) NOT NULL CHECK (mcc_risk_tier IN ('LOW', 'MODERATE', 'HIGH', 'PROHIBITED')),
    account_state VARCHAR(32) NOT NULL CHECK (account_state IN ('NORMAL', 'ELEVATED_WATCH', 'RESERVE_HIKE', 'PAYOUT_FROZEN', 'TERMINATED')),
    consecutive_breach_days INT NOT NULL DEFAULT 0,
    first_payout_completed_at TIMESTAMPTZ,
    expected_reversal_rate_180d NUMERIC(7,6) NOT NULL DEFAULT 0.005000,
    avg_fulfillment_days INT NOT NULL DEFAULT 2,
    accepted_risk_allowance NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    bank_guarantee_amount NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reserve_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchant_risk_profiles(merchant_id) ON DELETE CASCADE,
    reserve_type VARCHAR(24) NOT NULL CHECK (reserve_type IN ('ROLLING', 'CAPPED', 'FIXED', 'ADYEN_DEPOSIT')),
    calculation_base VARCHAR(16) NOT NULL CHECK (calculation_base IN ('GROSS', 'NET_AFTER_FEES')),
    hold_rate NUMERIC(7,4) NOT NULL CHECK (hold_rate >= 0 AND hold_rate <= 1),
    maturity_days INT NOT NULL CHECK (maturity_days >= 0),
    cap_amount NUMERIC(19,4),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reserve_tranches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    policy_id UUID NOT NULL REFERENCES reserve_policies(id),
    capture_batch_ref VARCHAR(128) NOT NULL UNIQUE,
    capture_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    initial_amount NUMERIC(19,4) NOT NULL CHECK (initial_amount > 0),
    remaining_amount NUMERIC(19,4) NOT NULL CHECK (remaining_amount >= 0),
    status VARCHAR(24) NOT NULL CHECK (status IN ('LOCKED', 'MATURED_UNRELEASED', 'MATURED_RELEASED', 'DEPLETED')),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tranches_fifo ON reserve_tranches (merchant_id, status, capture_date ASC, id ASC);

CREATE TABLE IF NOT EXISTS underwriting_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchant_risk_profiles(merchant_id) ON DELETE CASCADE,
    trigger_reason VARCHAR(64) NOT NULL,
    previous_state VARCHAR(32) NOT NULL,
    new_state VARCHAR(32) NOT NULL,
    previous_hold_rate NUMERIC(7,4) NOT NULL,
    new_hold_rate NUMERIC(7,4) NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
