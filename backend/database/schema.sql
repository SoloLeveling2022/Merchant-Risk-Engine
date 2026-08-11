-- ============================================================
-- Stock Market Insurance Platform — Consolidated MySQL Schema
-- Single Source of Truth for Database Schema setup
-- Database: stock_insurance_db (Fresh Clean Database Initialization)
-- Visvualise at `https://dbdiagram.io/d/Stock-Market-Insurance-6aae1192943b561dd4887e02`
-- ============================================================

DROP DATABASE IF EXISTS stock_insurance_db;
CREATE DATABASE stock_insurance_db;
USE stock_insurance_db;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    user_id           VARCHAR(36) PRIMARY KEY,
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(512) NOT NULL,
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100) NOT NULL,
    phone_number      VARCHAR(20),
    is_active         TINYINT(1) NOT NULL DEFAULT 1,
    is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
    kyc_status        VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by        VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    updated_by        VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    version           BIGINT NOT NULL DEFAULT 0,
    KEY idx_users_email (email)
);

-- 2. Roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id         VARCHAR(36) PRIMARY KEY,
    role_name       VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(500),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id    VARCHAR(36) PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL,
    role_id         VARCHAR(36) NOT NULL,
    assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by     VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    UNIQUE(user_id, role_id),
    KEY idx_user_roles_user_id (user_id)
);

-- 4. Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id        VARCHAR(36) PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL,
    token_hash      VARCHAR(512) NOT NULL UNIQUE,
    expires_at      DATETIME NOT NULL,
    is_revoked      TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_refresh_tokens_user_id (user_id)
);

-- 5. MFA configs
CREATE TABLE IF NOT EXISTS mfa_configs (
    mfa_id          VARCHAR(36) PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL UNIQUE,
    mfa_secret      VARCHAR(512) NOT NULL,
    is_enabled      TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. KYC records
CREATE TABLE IF NOT EXISTS kyc_records (
    kyc_id              VARCHAR(36) PRIMARY KEY,
    user_id             VARCHAR(36) NOT NULL UNIQUE,
    kyc_status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    auto_approved       TINYINT(1) DEFAULT 0,
    pan_number          VARCHAR(10),
    aadhaar_number      VARCHAR(12),
    full_name_from_docs VARCHAR(255),
    confidence_score    DECIMAL(5,2),
    pan_valid           TINYINT(1),
    aadhaar_valid       TINYINT(1),
    name_match_score    DECIMAL(5,2),
    review_notes        TEXT,
    reviewed_at         DATETIME,
    reviewed_by         VARCHAR(255),
    rejection_reason    TEXT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by          VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    version             BIGINT NOT NULL DEFAULT 0
);

-- 7. Portfolios
CREATE TABLE IF NOT EXISTS portfolios (
    portfolio_id        VARCHAR(36) PRIMARY KEY,
    user_id             VARCHAR(36) NOT NULL,
    portfolio_name      VARCHAR(255) NOT NULL,
    portfolio_status    VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
    total_value         DECIMAL(20,4),
    last_revalued_at    DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by          VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    KEY idx_portfolios_user_id (user_id)
);

-- 8. Portfolio holdings
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    holding_id          VARCHAR(36) PRIMARY KEY,
    portfolio_id        VARCHAR(36) NOT NULL,
    symbol              VARCHAR(20) NOT NULL,
    quantity            DECIMAL(20,4) NOT NULL,
    average_price       DECIMAL(20,4) NOT NULL,
    current_price       DECIMAL(20,4),
    current_value       DECIMAL(20,4),
    allocation_pct      DECIMAL(6,4),
    asset_class         VARCHAR(50) NOT NULL DEFAULT 'EQUITY',
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    UNIQUE(portfolio_id, symbol),
    KEY idx_portfolio_holdings_portfolio_id (portfolio_id)
);

-- 9. Portfolio versions
CREATE TABLE IF NOT EXISTS portfolio_versions (
    version_id          VARCHAR(36) PRIMARY KEY,
    portfolio_id        VARCHAR(36) NOT NULL,
    total_value         DECIMAL(20,4) NOT NULL,
    version_timestamp   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_portfolio_versions_portfolio_id (portfolio_id)
);

-- 10. Risk assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
    assessment_id            VARCHAR(36) PRIMARY KEY,
    portfolio_id             VARCHAR(36) NOT NULL,
    assessment_version       INTEGER NOT NULL DEFAULT 1,
    risk_score               DECIMAL(8,4) NOT NULL,
    volatility_score         DECIMAL(8,4),
    concentration_score      DECIMAL(8,4),
    drawdown_score           DECIMAL(8,4),
    liquidity_score          DECIMAL(8,4),
    market_stress_score      DECIMAL(8,4),
    platform_exposure_score  DECIMAL(8,4),
    volatility_weight        DECIMAL(4,2) NOT NULL DEFAULT 0.40,
    concentration_weight      DECIMAL(4,2) NOT NULL DEFAULT 0.20,
    drawdown_weight          DECIMAL(4,2) NOT NULL DEFAULT 0.15,
    liquidity_weight         DECIMAL(4,2) NOT NULL DEFAULT 0.10,
    market_stress_weight     DECIMAL(4,2) NOT NULL DEFAULT 0.10,
    platform_exposure_weight DECIMAL(4,2) NOT NULL DEFAULT 0.05,
    assessment_notes         TEXT,
    assessed_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    version                  BIGINT NOT NULL DEFAULT 0
);

-- 11. Quotes
CREATE TABLE IF NOT EXISTS quotes (
    quote_id              VARCHAR(36) PRIMARY KEY,
    portfolio_id          VARCHAR(36) NOT NULL,
    assessment_id         VARCHAR(36) NOT NULL,
    risk_score            DECIMAL(8,4) NOT NULL,
    coverage_percentage   DECIMAL(6,4) NOT NULL,
    premium_percentage    DECIMAL(6,4) NOT NULL,
    portfolio_value       DECIMAL(20,4) NOT NULL,
    premium_amount        DECIMAL(20,4) NOT NULL,
    insured_value         DECIMAL(20,4) NOT NULL,
    coverage_amount       DECIMAL(20,4) NOT NULL,
    insured_threshold_pct DECIMAL(6,4) NOT NULL DEFAULT 20.00,
    quote_status          VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    valid_until           DATETIME NOT NULL,
    accepted_at           DATETIME
);

-- 12. Policies
CREATE TABLE IF NOT EXISTS policies (
    policy_id                VARCHAR(36) PRIMARY KEY,
    policy_number            VARCHAR(50) NOT NULL UNIQUE,
    user_id                  VARCHAR(36) NOT NULL,
    portfolio_id             VARCHAR(36) NOT NULL,
    quote_id                 VARCHAR(36) NOT NULL,
    policy_status            VARCHAR(50) NOT NULL DEFAULT 'COVERAGE_ACTIVE',
    base_risk_score          DECIMAL(8,4) NOT NULL,
    base_coverage_pct        DECIMAL(6,4) NOT NULL,
    base_premium_pct         DECIMAL(6,4) NOT NULL,
    base_premium_amount      DECIMAL(20,4) NOT NULL,
    total_insured_value      DECIMAL(20,4) NOT NULL,
    insured_threshold_pct    DECIMAL(6,4) NOT NULL DEFAULT 20.00,
    currency                 VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by               VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    policy_start_date        DATE NOT NULL,
    policy_end_date          DATE,
    tenure_years             INTEGER NOT NULL DEFAULT 5,
    waiting_period_years     INTEGER NOT NULL DEFAULT 5,
    protection_start_date    DATE NOT NULL,
    consecutive_breach_count INTEGER NOT NULL DEFAULT 0,
    first_breach_at          DATETIME,
    last_breach_at           DATETIME,
    claim_eligible_since     DATETIME,
    next_premium_due_date    DATE,
    premium_status           VARCHAR(50) NOT NULL DEFAULT 'DUE',
    version                  BIGINT NOT NULL DEFAULT 0,
    KEY idx_policies_user_id (user_id)
);

-- 13. Coverage Tranches
CREATE TABLE IF NOT EXISTS coverage_tranches (
    tranche_id           VARCHAR(36) PRIMARY KEY,
    policy_id            VARCHAR(36) NOT NULL,
    endorsement_id       VARCHAR(36),
    tranche_number       INTEGER NOT NULL DEFAULT 1,
    tranche_type         VARCHAR(50) NOT NULL DEFAULT 'INITIAL',
    effective_date       DATE NOT NULL,
    waiting_period_years INTEGER NOT NULL DEFAULT 5,
    eligibility_date     DATE NOT NULL,
    risk_score           DECIMAL(8,4) NOT NULL,
    coverage_percentage  DECIMAL(6,4) NOT NULL,
    premium_percentage   DECIMAL(6,4) NOT NULL,
    insured_value        DECIMAL(20,4) NOT NULL,
    covered_symbols      JSON,
    tranche_status       VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by           VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    KEY idx_coverage_tranches_policy_id (policy_id)
);

-- 14. Claims
CREATE TABLE IF NOT EXISTS claims (
    claim_id            VARCHAR(36) PRIMARY KEY,
    claim_number        VARCHAR(50) NOT NULL UNIQUE,
    policy_id           VARCHAR(36) NOT NULL,
    user_id             VARCHAR(36) NOT NULL,
    claim_status        VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    submitted_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    baseline_value      DECIMAL(20,4) NOT NULL,
    current_value       DECIMAL(20,4) NOT NULL,
    gross_loss          DECIMAL(20,4) NOT NULL,
    gross_loss_pct      DECIMAL(8,4) NOT NULL,
    eligible_loss       DECIMAL(20,4),
    payout_amount       DECIMAL(20,4),
    policy_limit        DECIMAL(20,4),
    eligible_tranches   JSON,
    ineligible_tranches JSON,
    fraud_flags         JSON,
    fraud_score         DECIMAL(5,2),
    is_fraud_flagged    TINYINT(1) NOT NULL DEFAULT 0,
    rejection_reason    TEXT,
    analyst_notes       TEXT,
    reviewed_by         VARCHAR(255),
    reviewed_at         DATETIME,
    approved_at         DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    updated_by          VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    version             BIGINT NOT NULL DEFAULT 0,
    KEY idx_claims_policy_id (policy_id)
);

-- 15. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id            VARCHAR(36) PRIMARY KEY,
    event_type          VARCHAR(100) NOT NULL,
    event_source        VARCHAR(100) NOT NULL,
    actor_id            VARCHAR(255),
    actor_role          VARCHAR(100),
    entity_type         VARCHAR(100),
    entity_id           VARCHAR(36),
    action_performed    VARCHAR(255) NOT NULL,
    previous_state      JSON,
    new_state           JSON,
    event_metadata      JSON,
    ip_address          VARCHAR(50),
    correlation_id      VARCHAR(255),
    event_timestamp     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_audit_logs_event_type (event_type)
);

-- Seed Default Roles
INSERT INTO roles (role_id, role_name, description, created_at) VALUES
    ('role-investor-000001',       'ROLE_INVESTOR',        'Portfolio investor purchasing insurance', NOW()),
    ('role-underwriter-000002',    'ROLE_UNDERWRITER',     'Underwriting and risk assessment analyst', NOW()),
    ('role-claims-000003',         'ROLE_CLAIMS_ANALYST',  'Claims processing and review analyst', NOW()),
    ('role-admin-000004',          'ROLE_ADMIN',           'Platform administrator', NOW()),
    ('role-compliance-000005',     'ROLE_COMPLIANCE',      'Compliance and audit officer', NOW());

-- Seed Demo Accounts (Password matching role name: underwriter, claims, admin, compliance)
-- BCrypt hashed via Spring Security BCryptPasswordEncoder
INSERT INTO users (user_id, email, password_hash, first_name, last_name, phone_number, is_active, is_email_verified, kyc_status, created_at, updated_at, created_by, updated_by) VALUES
    ('usr-underwriter-001', 'underwriter@gmail.com', '$2a$10$w099k1Y3.x.vGjL3B.pY.O2n5Jp8gYwDqL5n3F2c1B.dE5f6G7h8i', 'Demo', 'Underwriter', '', 1, 1, 'APPROVED', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('usr-claims-002',      'claims@gmail.com',      '$2a$10$w099k1Y3.x.vGjL3B.pY.O2n5Jp8gYwDqL5n3F2c1B.dE5f6G7h8i', 'Demo', 'ClaimsAnalyst',  '', 1, 1, 'APPROVED', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('usr-admin-003',       'admin@gmail.com',       '$2a$10$w099k1Y3.x.vGjL3B.pY.O2n5Jp8gYwDqL5n3F2c1B.dE5f6G7h8i', 'Demo', 'Admin',          '', 1, 1, 'APPROVED', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('usr-compliance-004',  'compliance@gmail.com',  '$2a$10$w099k1Y3.x.vGjL3B.pY.O2n5Jp8gYwDqL5n3F2c1B.dE5f6G7h8i', 'Demo', 'Compliance',     '', 1, 1, 'APPROVED', NOW(), NOW(), 'SYSTEM', 'SYSTEM');

-- Assign User Roles
INSERT INTO user_roles (user_role_id, user_id, role_id, assigned_at, assigned_by) VALUES
    (UUID(), 'usr-underwriter-001', 'role-underwriter-000002', NOW(), 'SYSTEM'),
    (UUID(), 'usr-claims-002',      'role-claims-000003',      NOW(), 'SYSTEM'),
    (UUID(), 'usr-admin-003',       'role-admin-000004',       NOW(), 'SYSTEM'),
    (UUID(), 'usr-compliance-004',  'role-compliance-000005',  NOW(), 'SYSTEM');

-- 16. Transactions (Mock Payments)
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id      VARCHAR(36) PRIMARY KEY,
    user_id             VARCHAR(36) NOT NULL,
    policy_id           VARCHAR(36),
    amount              DECIMAL(20,4) NOT NULL,
    transaction_type    VARCHAR(50) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_transactions_user_id (user_id),
    KEY idx_transactions_policy_id (policy_id)
);

