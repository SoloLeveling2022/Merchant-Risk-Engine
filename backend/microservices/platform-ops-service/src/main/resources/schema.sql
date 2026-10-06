CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
