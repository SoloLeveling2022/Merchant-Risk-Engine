# Database Design: `stock_insurance_db`

Accurate representation of the database schema from `schema.sql`.

## 1. Users (`users`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `user_id` | `VARCHAR(36)` | PK |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE |
| `password_hash` | `VARCHAR(512)` | NOT NULL |
| `first_name` | `VARCHAR(100)` | NOT NULL |
| `last_name` | `VARCHAR(100)` | NOT NULL |
| `phone_number` | `VARCHAR(20)` | |
| `is_active` | `TINYINT(1)` | NOT NULL, DEFAULT 1 |
| `is_email_verified` | `TINYINT(1)` | NOT NULL, DEFAULT 0 |
| `kyc_status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'PENDING' |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `created_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `updated_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `version` | `BIGINT` | NOT NULL, DEFAULT 0 |

*Index:* `idx_users_email` (`email`)

## 2. Roles (`roles`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `role_id` | `VARCHAR(36)` | PK |
| `role_name` | `VARCHAR(100)` | NOT NULL, UNIQUE |
| `description` | `VARCHAR(500)` | |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

## 3. User Roles (`user_roles`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `user_role_id` | `VARCHAR(36)` | PK |
| `user_id` | `VARCHAR(36)` | NOT NULL |
| `role_id` | `VARCHAR(36)` | NOT NULL |
| `assigned_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `assigned_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |

*Constraints & Indexes:* `UNIQUE(user_id, role_id)`, `idx_user_roles_user_id` (`user_id`)

## 4. Refresh Tokens (`refresh_tokens`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `token_id` | `VARCHAR(36)` | PK |
| `user_id` | `VARCHAR(36)` | NOT NULL |
| `token_hash` | `VARCHAR(512)` | NOT NULL, UNIQUE |
| `expires_at` | `DATETIME` | NOT NULL |
| `is_revoked` | `TINYINT(1)` | NOT NULL, DEFAULT 0 |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

*Index:* `idx_refresh_tokens_user_id` (`user_id`)

## 5. MFA Configs (`mfa_configs`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `mfa_id` | `VARCHAR(36)` | PK |
| `user_id` | `VARCHAR(36)` | NOT NULL, UNIQUE |
| `mfa_secret` | `VARCHAR(512)` | NOT NULL |
| `is_enabled` | `TINYINT(1)` | NOT NULL, DEFAULT 0 |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |

## 6. KYC Records (`kyc_records`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `kyc_id` | `VARCHAR(36)` | PK |
| `user_id` | `VARCHAR(36)` | NOT NULL, UNIQUE |
| `kyc_status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'PENDING' |
| `auto_approved` | `TINYINT(1)` | DEFAULT 0 |
| `pan_number` | `VARCHAR(10)` | |
| `aadhaar_number` | `VARCHAR(12)` | |
| `full_name_from_docs` | `VARCHAR(255)` | |
| `confidence_score` | `DECIMAL(5,2)` | |
| `pan_valid` | `TINYINT(1)` | |
| `aadhaar_valid` | `TINYINT(1)` | |
| `name_match_score` | `DECIMAL(5,2)` | |
| `review_notes` | `TEXT` | |
| `reviewed_at` | `DATETIME` | |
| `reviewed_by` | `VARCHAR(255)` | |
| `rejection_reason` | `TEXT` | |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `created_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `updated_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `version` | `BIGINT` | NOT NULL, DEFAULT 0 |

## 7. Portfolios (`portfolios`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `portfolio_id` | `VARCHAR(36)` | PK |
| `user_id` | `VARCHAR(36)` | NOT NULL |
| `portfolio_name` | `VARCHAR(255)` | NOT NULL |
| `portfolio_status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'ACTIVE' |
| `currency` | `VARCHAR(10)` | NOT NULL, DEFAULT 'INR' |
| `total_value` | `DECIMAL(20,4)` | |
| `last_revalued_at` | `DATETIME` | |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `created_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `updated_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |

*Index:* `idx_portfolios_user_id` (`user_id`)

## 8. Portfolio Holdings (`portfolio_holdings`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `holding_id` | `VARCHAR(36)` | PK |
| `portfolio_id` | `VARCHAR(36)` | NOT NULL |
| `symbol` | `VARCHAR(20)` | NOT NULL |
| `quantity` | `DECIMAL(20,4)` | NOT NULL |
| `average_price` | `DECIMAL(20,4)` | NOT NULL |
| `current_price` | `DECIMAL(20,4)` | |
| `current_value` | `DECIMAL(20,4)` | |
| `allocation_pct` | `DECIMAL(6,4)` | |
| `asset_class` | `VARCHAR(50)` | NOT NULL, DEFAULT 'EQUITY' |
| `is_active` | `TINYINT(1)` | NOT NULL, DEFAULT 1 |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `created_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |

*Constraints & Indexes:* `UNIQUE(portfolio_id, symbol)`, `idx_portfolio_holdings_portfolio_id` (`portfolio_id`)

## 9. Portfolio Versions (`portfolio_versions`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `version_id` | `VARCHAR(36)` | PK |
| `portfolio_id` | `VARCHAR(36)` | NOT NULL |
| `total_value` | `DECIMAL(20,4)` | NOT NULL |
| `version_timestamp` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

*Index:* `idx_portfolio_versions_portfolio_id` (`portfolio_id`)

## 10. Risk Assessments (`risk_assessments`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `assessment_id` | `VARCHAR(36)` | PK |
| `portfolio_id` | `VARCHAR(36)` | NOT NULL |
| `assessment_version` | `INTEGER` | NOT NULL, DEFAULT 1 |
| `risk_score` | `DECIMAL(8,4)` | NOT NULL |
| `volatility_score` | `DECIMAL(8,4)` | |
| `concentration_score` | `DECIMAL(8,4)` | |
| `drawdown_score` | `DECIMAL(8,4)` | |
| `liquidity_score` | `DECIMAL(8,4)` | |
| `market_stress_score` | `DECIMAL(8,4)` | |
| `platform_exposure_score` | `DECIMAL(8,4)` | |
| `volatility_weight` | `DECIMAL(4,2)` | NOT NULL, DEFAULT 0.40 |
| `concentration_weight` | `DECIMAL(4,2)` | NOT NULL, DEFAULT 0.20 |
| `drawdown_weight` | `DECIMAL(4,2)` | NOT NULL, DEFAULT 0.15 |
| `liquidity_weight` | `DECIMAL(4,2)` | NOT NULL, DEFAULT 0.10 |
| `market_stress_weight` | `DECIMAL(4,2)` | NOT NULL, DEFAULT 0.10 |
| `platform_exposure_weight`| `DECIMAL(4,2)` | NOT NULL, DEFAULT 0.05 |
| `assessment_notes` | `TEXT` | |
| `assessed_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `created_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `version` | `BIGINT` | NOT NULL, DEFAULT 0 |

## 11. Quotes (`quotes`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `quote_id` | `VARCHAR(36)` | PK |
| `portfolio_id` | `VARCHAR(36)` | NOT NULL |
| `assessment_id` | `VARCHAR(36)` | NOT NULL |
| `risk_score` | `DECIMAL(8,4)` | NOT NULL |
| `coverage_percentage` | `DECIMAL(6,4)` | NOT NULL |
| `premium_percentage` | `DECIMAL(6,4)` | NOT NULL |
| `portfolio_value` | `DECIMAL(20,4)` | NOT NULL |
| `premium_amount` | `DECIMAL(20,4)` | NOT NULL |
| `insured_value` | `DECIMAL(20,4)` | NOT NULL |
| `coverage_amount` | `DECIMAL(20,4)` | NOT NULL |
| `insured_threshold_pct` | `DECIMAL(6,4)` | NOT NULL, DEFAULT 20.00 |
| `quote_status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'ACTIVE' |
| `valid_until` | `DATETIME` | NOT NULL |
| `accepted_at` | `DATETIME` | |

## 12. Policies (`policies`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `policy_id` | `VARCHAR(36)` | PK |
| `policy_number` | `VARCHAR(50)` | NOT NULL, UNIQUE |
| `user_id` | `VARCHAR(36)` | NOT NULL |
| `portfolio_id` | `VARCHAR(36)` | NOT NULL |
| `quote_id` | `VARCHAR(36)` | NOT NULL |
| `policy_status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'COVERAGE_ACTIVE' |
| `base_risk_score` | `DECIMAL(8,4)` | NOT NULL |
| `base_coverage_pct` | `DECIMAL(6,4)` | NOT NULL |
| `base_premium_pct` | `DECIMAL(6,4)` | NOT NULL |
| `base_premium_amount` | `DECIMAL(20,4)` | NOT NULL |
| `total_insured_value` | `DECIMAL(20,4)` | NOT NULL |
| `insured_threshold_pct` | `DECIMAL(6,4)` | NOT NULL, DEFAULT 20.00 |
| `currency` | `VARCHAR(10)` | NOT NULL, DEFAULT 'INR' |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `created_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `updated_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `policy_start_date` | `DATE` | NOT NULL |
| `policy_end_date` | `DATE` | |
| `waiting_period_years` | `INTEGER` | NOT NULL, DEFAULT 5 |
| `protection_start_date` | `DATE` | NOT NULL |
| `consecutive_breach_count` | `INTEGER` | NOT NULL, DEFAULT 0 |
| `first_breach_at` | `DATETIME` | |
| `last_breach_at` | `DATETIME` | |
| `claim_eligible_since` | `DATETIME` | |
| `next_premium_due_date` | `DATE` | |
| `premium_status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'DUE' |
| `version` | `BIGINT` | NOT NULL, DEFAULT 0 |

*Index:* `idx_policies_user_id` (`user_id`)

## 13. Coverage Tranches (`coverage_tranches`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `tranche_id` | `VARCHAR(36)` | PK |
| `policy_id` | `VARCHAR(36)` | NOT NULL |
| `endorsement_id` | `VARCHAR(36)` | |
| `tranche_number` | `INTEGER` | NOT NULL, DEFAULT 1 |
| `tranche_type` | `VARCHAR(50)` | NOT NULL, DEFAULT 'INITIAL' |
| `effective_date` | `DATE` | NOT NULL |
| `waiting_period_years` | `INTEGER` | NOT NULL, DEFAULT 5 |
| `eligibility_date` | `DATE` | NOT NULL |
| `risk_score` | `DECIMAL(8,4)` | NOT NULL |
| `coverage_percentage` | `DECIMAL(6,4)` | NOT NULL |
| `premium_percentage` | `DECIMAL(6,4)` | NOT NULL |
| `insured_value` | `DECIMAL(20,4)` | NOT NULL |
| `covered_symbols` | `JSON` | |
| `tranche_status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'ACTIVE' |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `created_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `updated_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |

*Index:* `idx_coverage_tranches_policy_id` (`policy_id`)

## 14. Claims (`claims`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `claim_id` | `VARCHAR(36)` | PK |
| `claim_number` | `VARCHAR(50)` | NOT NULL, UNIQUE |
| `policy_id` | `VARCHAR(36)` | NOT NULL |
| `user_id` | `VARCHAR(36)` | NOT NULL |
| `claim_status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'SUBMITTED' |
| `submitted_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `baseline_value` | `DECIMAL(20,4)` | NOT NULL |
| `current_value` | `DECIMAL(20,4)` | NOT NULL |
| `gross_loss` | `DECIMAL(20,4)` | NOT NULL |
| `gross_loss_pct` | `DECIMAL(8,4)` | NOT NULL |
| `eligible_loss` | `DECIMAL(20,4)` | |
| `payout_amount` | `DECIMAL(20,4)` | |
| `eligible_tranches` | `JSON` | |
| `ineligible_tranches` | `JSON` | |
| `fraud_flags` | `JSON` | |
| `fraud_score` | `DECIMAL(5,2)` | |
| `is_fraud_flagged` | `TINYINT(1)` | NOT NULL, DEFAULT 0 |
| `rejection_reason` | `TEXT` | |
| `analyst_notes` | `TEXT` | |
| `reviewed_by` | `VARCHAR(255)` | |
| `reviewed_at` | `DATETIME` | |
| `approved_at` | `DATETIME` | |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `created_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `updated_by` | `VARCHAR(255)` | NOT NULL, DEFAULT 'SYSTEM' |
| `version` | `BIGINT` | NOT NULL, DEFAULT 0 |

*Index:* `idx_claims_policy_id` (`policy_id`)

## 15. Audit Logs (`audit_logs`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `audit_id` | `VARCHAR(36)` | PK |
| `event_type` | `VARCHAR(100)` | NOT NULL |
| `event_source` | `VARCHAR(100)` | NOT NULL |
| `actor_id` | `VARCHAR(255)` | |
| `actor_role` | `VARCHAR(100)` | |
| `entity_type` | `VARCHAR(100)` | |
| `entity_id` | `VARCHAR(36)` | |
| `action_performed` | `VARCHAR(255)` | NOT NULL |
| `previous_state` | `JSON` | |
| `new_state` | `JSON` | |
| `event_metadata` | `JSON` | |
| `ip_address` | `VARCHAR(50)` | |
| `correlation_id` | `VARCHAR(255)` | |
| `event_timestamp` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

*Index:* `idx_audit_logs_event_type` (`event_type`)

## Relationships Overview
- `users` **1:N** `user_roles` **N:1** `roles`
- `users` **1:N** `refresh_tokens`
- `users` **1:1** `mfa_configs`
- `users` **1:1** `kyc_records`
- `users` **1:N** `portfolios`
- `portfolios` **1:N** `portfolio_holdings`
- `portfolios` **1:N** `portfolio_versions`
- `portfolios` **1:N** `risk_assessments`
- `portfolios` **1:N** `quotes` (relies on `assessment_id`)
- `users` **1:N** `policies` (relies on `portfolio_id`, `quote_id`)
- `policies` **1:N** `coverage_tranches`
- `policies` **1:N** `claims` (relies on `user_id`)
- `users` **1:N** `transactions` (relies on `policy_id`)

## 16. Transactions (`transactions`)
| Column | Type | Attributes |
| :--- | :--- | :--- |
| `transaction_id` | `VARCHAR(36)` | PK |
| `user_id` | `VARCHAR(36)` | NOT NULL |
| `policy_id` | `VARCHAR(36)` | |
| `amount` | `DECIMAL(20,4)` | NOT NULL |
| `transaction_type` | `VARCHAR(50)` | NOT NULL |
| `status` | `VARCHAR(50)` | NOT NULL, DEFAULT 'SUCCESS' |
| `created_at` | `DATETIME` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

*Index:* `idx_transactions_user_id` (`user_id`), `idx_transactions_policy_id` (`policy_id`)
