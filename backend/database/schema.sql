-- ============================================================================
-- Merchant Risk, Rolling Reserve & Automated Dispute Settlement Database Schema
-- Dialect: PostgreSQL 16+ (R2DBC Reactive Compliant)
-- Invariant: Zero-Sum Double-Entry Ledger, Strict NUMERIC(19,4), TIMESTAMPTZ, Optimistic Locking
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. MERCHANT IDENTITY SERVICE DOMAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_entities (
    merchant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mid VARCHAR(32) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    mcc VARCHAR(4) NOT NULL,
    billing_descriptor_prefix VARCHAR(6) NOT NULL,
    kyb_status VARCHAR(24) NOT NULL CHECK (kyb_status IN ('PENDING', 'VERIFIED', 'RESTRICTED', 'REJECTED')),
    ubo_identity_hash VARCHAR(128) NOT NULL,
    onboarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS merchant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchant_entities(merchant_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('ROLE_MERCHANT_OWNER', 'ROLE_MERCHANT_FINANCE', 'ROLE_RISK_ANALYST', 'ROLE_RISK_ADMIN')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. MERCHANT VELOCITY SERVICE DOMAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_velocity_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    window_date DATE NOT NULL,
    gmv_24h NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    trailing_30d_avg_daily_gmv NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    aov_24h NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    aov_90d_mean NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    aov_90d_stddev NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    refund_count_30d BIGINT NOT NULL DEFAULT 0,
    settled_cnp_count_mtd BIGINT NOT NULL DEFAULT 0,
    visa_tc40_count_mtd BIGINT NOT NULL DEFAULT 0,
    visa_tc15_count_mtd BIGINT NOT NULL DEFAULT 0,
    visa_excluded_count_mtd BIGINT NOT NULL DEFAULT 0,
    mc_sales_prev_month BIGINT NOT NULL DEFAULT 0,
    mc_chargebacks_mtd BIGINT NOT NULL DEFAULT 0,
    enumerated_auth_count_mtd BIGINT NOT NULL DEFAULT 0,
    total_auth_count_mtd BIGINT NOT NULL DEFAULT 0,
    fulfillment_confirmed_ratio NUMERIC(7,4) NOT NULL DEFAULT 1.0000,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (merchant_id, window_date)
);

CREATE TABLE IF NOT EXISTS transaction_telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    merchant_id UUID NOT NULL,
    card_network VARCHAR(16) NOT NULL CHECK (card_network IN ('VISA', 'MASTERCARD', 'AMEX', 'OTHER')),
    event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('AUTH_APPROVED', 'AUTH_DECLINED', 'CAPTURE_SETTLED', 'REFUND', 'FULFILLMENT_CONFIRMED')),
    amount NUMERIC(19,4) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    is_cnp BOOLEAN NOT NULL DEFAULT TRUE,
    is_enumerated_pattern BOOLEAN NOT NULL DEFAULT FALSE,
    device_fingerprint_hash VARCHAR(128),
    client_ip INET,
    occurred_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- 3. RESERVE UNDERWRITING SERVICE DOMAIN
-- ============================================================================

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

-- ============================================================================
-- 4. DISPUTE SETTLEMENT & DOUBLE-ENTRY LEDGER DOMAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    account_type VARCHAR(40) NOT NULL CHECK (account_type IN (
        'CARD_NETWORK_CLEARING_ASSET',
        'MERCHANT_SETTLEMENT_ACCOUNT',
        'ROLLING_RESERVE_ESCROW',
        'CHARGEBACK_LIABILITY_ACCOUNT',
        'FEE_ACCOUNT'
    )),
    normal_balance VARCHAR(8) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    posted_balance NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    version BIGINT NOT NULL DEFAULT 0,
    UNIQUE (merchant_id, account_type, currency)
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    merchant_id UUID NOT NULL,
    tx_category VARCHAR(32) NOT NULL CHECK (tx_category IN (
        'CAPTURE', 'PAYOUT', 'RESERVE_RELEASE', 'CHARGEBACK_FILED',
        'NETWORK_SETTLE', 'REPRESENTMENT_WON', 'CLAWBACK_RECOVERY'
    )),
    reference_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    direction VARCHAR(8) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_dispute_ref VARCHAR(128) NOT NULL UNIQUE,
    merchant_id UUID NOT NULL,
    original_tx_id UUID NOT NULL,
    card_network VARCHAR(16) NOT NULL,
    record_code VARCHAR(16) NOT NULL CHECK (record_code IN ('VISA_TC40', 'VISA_TC15', 'MC_FIRST_PRES', 'RDR_PRE_DISPUTE')),
    reason_code VARCHAR(16) NOT NULL,
    dispute_amount NUMERIC(19,4) NOT NULL CHECK (dispute_amount > 0),
    dispute_fee NUMERIC(19,4) NOT NULL DEFAULT 15.0000,
    ce30_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    within_24h_first_payout BOOLEAN NOT NULL DEFAULT FALSE,
    bust_out_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(24) NOT NULL CHECK (status IN ('OPEN', 'RDR_REFUNDED', 'REPRESENTMENT_SUBMITTED', 'WON', 'LOST')),
    filed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payout_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    merchant_id UUID NOT NULL,
    requested_amount NUMERIC(19,4) NOT NULL CHECK (requested_amount > 0),
    withheld_deposit_amount NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    disbursed_amount NUMERIC(19,4) NOT NULL CHECK (disbursed_amount >= 0),
    status VARCHAR(24) NOT NULL CHECK (status IN ('SCHEDULED', 'HELD_EXPOSURE', 'DISBURSED', 'FROZEN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. PLATFORM OPS SERVICE DOMAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS acquirer_vamp_rollups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acquirer_region VARCHAR(16) NOT NULL,
    reporting_month CHAR(7) NOT NULL,
    portfolio_tc40_count BIGINT NOT NULL DEFAULT 0,
    portfolio_tc15_count BIGINT NOT NULL DEFAULT 0,
    portfolio_excluded_count BIGINT NOT NULL DEFAULT 0,
    portfolio_tc05_count BIGINT NOT NULL DEFAULT 0,
    acquirer_vamp_ratio_bps INT NOT NULL DEFAULT 0,
    tier_status VARCHAR(24) NOT NULL CHECK (tier_status IN ('COMPLIANT', 'ABOVE_STANDARD', 'EXCESSIVE')),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (acquirer_region, reporting_month)
);

CREATE TABLE IF NOT EXISTS ecp_compliance_trackers (
    merchant_id UUID PRIMARY KEY,
    current_tier VARCHAR(16) NOT NULL CHECK (current_tier IN ('NONE', 'ECM', 'HECM')),
    violation_months_count INT NOT NULL DEFAULT 0,
    consecutive_clean_months INT NOT NULL DEFAULT 0,
    projected_monthly_fine_usd NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    last_evaluated_month CHAR(7) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS risk_ops_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL,
    analyst_id VARCHAR(128) NOT NULL,
    action_type VARCHAR(32) NOT NULL CHECK (action_type IN ('MANUAL_FREEZE', 'RELEASE_FREEZE', 'POLICY_STEP_DOWN', 'MATCH_ESCALATION')),
    justification TEXT NOT NULL,
    correlation_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
