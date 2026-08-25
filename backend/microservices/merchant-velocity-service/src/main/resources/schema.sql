CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
