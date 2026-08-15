CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
