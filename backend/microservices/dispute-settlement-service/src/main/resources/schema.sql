CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
