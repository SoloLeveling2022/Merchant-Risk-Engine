# Merchant Risk Engine - Database Architecture & Invariants

## 1. Overview
The **Merchant Risk, Rolling Reserve, and Automated Dispute Settlement Engine** database architecture is designed for non-blocking reactive persistence over PostgreSQL using Spring Data R2DBC. It guarantees strict zero-sum double-entry accounting invariants, optimistic concurrency control (`@Version`), and high-performance chronological tranche querying.

## 2. Core Invariants
1. **Double-Entry Ledger Balance Invariant**:
   $$\sum \text{Debits} = \sum \text{Credits} > 0$$
   Total assets equal total liabilities plus revenue:
   $$\text{Assets} = \text{Liabilities} + \text{Revenue}$$
2. **Deterministic FIFO Tranche Liquidation**:
   Dispute claims drain escrow chronologically:
   `ORDER BY CASE WHEN status = 'MATURED_UNRELEASED' THEN 0 ELSE 1 END, capture_date ASC, id ASC`
3. **Monetary Precision**:
   All monetary fields are strictly `NUMERIC(19,4)` to prevent IEEE 754 floating-point rounding errors.
4. **Optimistic Locking**:
   Mutable state tables (`reserve_tranches`, `ledger_accounts`, `merchant_risk_profiles`, `ecp_compliance_trackers`, `merchant_entities`) maintain a `version BIGINT NOT NULL DEFAULT 0` column.

## 3. Account Taxonomy & Normal Balances
| Account Type | Category | Normal Balance | Delta Semantics |
| :--- | :--- | :--- | :--- |
| `CARD_NETWORK_CLEARING_ASSET` | Asset | DEBIT | +Debit / -Credit |
| `MERCHANT_SETTLEMENT_ACCOUNT` | Liability | CREDIT | +Credit / -Debit |
| `ROLLING_RESERVE_ESCROW` | Liability | CREDIT | +Credit / -Debit |
| `CHARGEBACK_LIABILITY_ACCOUNT` | Liability | CREDIT | +Credit / -Debit |
| `FEE_ACCOUNT` | Revenue | CREDIT | +Credit / -Debit |

## 4. Five-Stage Transaction Lifecycle
1. **Capture**: Gross capture booked to Clearing Asset; fee to Fee Account, rolling reserve to Escrow, net settlement to Settlement Account.
2. **Partial Payout**: Disburses settled funds from Settlement Account to merchant bank via Clearing Asset.
3. **Chargeback Filed**: Dispute amount + fee drawn from Settlement, Escrow, and deficit booked to Settlement (negative clawback receivable).
4. **Network Settle**: Liability remitted to card network.
5. **Recovery Capture**: New sales revenue nets against clawback deficit, restoring positive settlement balance.
