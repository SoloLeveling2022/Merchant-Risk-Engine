# Stock Market Insurance Platform — System Architecture

## 1\. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                         │
│   Angular 17 (Nx Monorepo / Micro-Frontend / Module Federation)             │
│   Investor UI | Underwriter UI | Claims UI | Compliance UI | Admin UI       │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ HTTPS / WSS / SSE
┌──────────────────────────────▼──────────────────────────────────────────────┐
│                    API GATEWAY  (Port 9070)                                 │
│        Spring Cloud Gateway + WebFlux + JWT Validation + Rate Limiting      │
│        RBAC Filter | Global Exception Handler | Structured Logging          │
└─────────┬──────────┬──────────┬──────────┬──────────┬────────────┬──────────┘
          │          │          │          │          │            │
     ┌────▼──┐  ┌────▼──┐  ┌───▼───┐  ┌───▼───┐  ┌──▼────┐  ┌───▼──────┐
     │ Auth  │  │ User  │  │  KYC  │  │ Port  │  │Under  │  │ Policy   │
     │ :9081 │  │ :8082 │  │ :8083 │  │ :8084 │  │:8085  │  │ :8086    │
     └───────┘  └───────┘  └───────┘  └───────┘  └───────┘  └──────────┘
          │                                │            │          │
     ┌────▼──┐  ┌──────────┐  ┌───────┐  ┌▼──────┐  ┌─▼─────┐  ┌▼────────┐
     │Endors │  │ Market   │  │Market │  │Claims │  │Payment│  │Notif    │
     │ :8087 │  │ Oracle   │  │ Sim   │  │ :8090 │  │ :8091 │  │ :8092   │
     └───────┘  │ :8088    │  │ :8089 │  └───────┘  └───────┘  └─────────┘
                └──────────┘  └───────┘
                                              ┌──────────┐
                                              │  Audit   │
                                              │  :8093   │
                                              └──────────┘
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE LAYER                                │
│   PostgreSQL (R2DBC)  |  Redis (Reactive)  |  RabbitMQ (Event Bus)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

\---

## 2\. Microservice Architecture

### Bounded Contexts \& Services

|Bounded Context|Service|Responsibility|
|-|-|-|
|Identity \& Access|auth-service|JWT, MFA, RBAC, Token Refresh|
|Identity \& Access|user-service|Profile, Preferences, Contact|
|Compliance|kyc-service|OCR, PAN/Aadhaar Validation, Approval|
|Portfolio Management|portfolio-service|Holdings, Snapshots, Versioning, Change Detection|
|Risk \& Pricing|underwriting-service|Risk Engine, Coverage, Premium, Quote|
|Market Intelligence|market-oracle-service|Price Feed, Revaluation, Threshold Detection|
|Market Intelligence|market-simulation-service|Replay Engine, Synthetic Prices, Scenarios|
|Insurance Core|policy-service|Lifecycle, Tranches, Waiting Period, Baseline|
|Insurance Core|endorsement-service|Re-underwriting, Policy Modification|
|Claims|claims-service|Eligibility, Validation, Fraud, Workflow|
|Payments|payment-service|Premium Collection, Claim Settlement (Mock)|
|Communications|notification-service|Email, Alerts|
|Governance|audit-service|Immutable Event Log, Compliance|
|Infrastructure|api-gateway|Routing, Auth Filter, Rate Limiting|

\---

## 3\. Bounded Context Design (DDD)

### Context Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│  IDENTITY CONTEXT                                                        │
│  ┌─────────────────┐    ┌──────────────────┐                           │
│  │   auth-service  │───▶│   user-service   │                           │
│  │ (Upstream)      │    │ (Downstream)      │                           │
│  └─────────────────┘    └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────┘
         │ UserRegistered, KycApproved
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  COMPLIANCE CONTEXT                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        kyc-service                               │   │
│  │  (Anti-Corruption Layer — OCR → Validation → Decision)          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         │ KycApproved
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PORTFOLIO CONTEXT                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  portfolio-service (Core Subdomain)                                │ │
│  │  Holdings | Snapshots | Versions | Change Detection                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
         │ PortfolioImported, PortfolioChanged
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  RISK \& PRICING CONTEXT (Core Domain)                                   │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  underwriting-service                                              │ │
│  │  Risk Engine | Coverage Matrix | Premium Matrix | Quote Engine     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
         │ QuoteGenerated
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  INSURANCE CORE CONTEXT (Core Domain)                                   │
│  ┌────────────────────────┐    ┌───────────────────────────────────┐   │
│  │    policy-service      │◀──▶│     endorsement-service           │   │
│  │  Lifecycle | Tranches  │    │  Re-Underwriting | Modifications   │   │
│  │  Waiting Period        │    │  Tranche Creation                  │   │
│  └────────────────────────┘    └───────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         │ ClaimEligible
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CLAIMS CONTEXT (Core Domain)                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  claims-service                                                    │ │
│  │  Eligibility | Validation | Fraud Detection | Workflow             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
         │ ClaimApproved
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PAYMENT CONTEXT (Supporting Domain)                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  payment-service (Mock Gateway)                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
│ CROSS-CUTTING CONTEXTS                                                  │
│  market-oracle-service | market-simulation-service                      │
│  notification-service  | audit-service                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

\---

## 4\. Event-Driven Architecture

### Domain Events

|Event|Publisher|Subscribers|
|-|-|-|
|`UserRegistered`|auth-service|user-service, audit-service|
|`KycApproved`|kyc-service|user-service, portfolio-service, audit-service|
|`KycRejected`|kyc-service|notification-service, audit-service|
|`PortfolioImported`|portfolio-service|underwriting-service, audit-service|
|`PortfolioChanged`|portfolio-service|endorsement-service, underwriting-service, audit-service|
|`RiskCalculated`|underwriting-service|policy-service, audit-service|
|`QuoteGenerated`|underwriting-service|policy-service, notification-service, audit-service|
|`PolicyPurchased`|policy-service|payment-service, notification-service, audit-service|
|`WaitingPeriodStarted`|policy-service|notification-service, audit-service|
|`ProtectionActivated`|policy-service|market-oracle-service, notification-service, audit-service|
|`MarketPriceUpdated`|market-oracle-service|portfolio-service, audit-service|
|`PortfolioRevalued`|market-oracle-service|policy-service, audit-service|
|`ThresholdBreached`|market-oracle-service|policy-service, audit-service|
|`ThresholdConfirmed5Min`|market-oracle-service|policy-service, notification-service, audit-service|
|`EndorsementCreated`|endorsement-service|notification-service, audit-service|
|`EndorsementAccepted`|endorsement-service|policy-service, payment-service, audit-service|
|`EndorsementRejected`|endorsement-service|policy-service, notification-service, audit-service|
|`TranchCreated`|policy-service|audit-service|
|`ClaimEligible`|policy-service|notification-service, audit-service|
|`ClaimSubmitted`|claims-service|audit-service|
|`ClaimApproved`|claims-service|payment-service, notification-service, audit-service|
|`ClaimRejected`|claims-service|notification-service, audit-service|
|`PaymentExecuted`|payment-service|notification-service, audit-service|

### Event Transport: RabbitMQ (Topic Exchange)

```
Exchange: stock-insurance.events (topic)
Routing Keys:
  user.\*          → user.registered, user.kyc.approved, user.kyc.rejected
  portfolio.\*     → portfolio.imported, portfolio.changed, portfolio.revalued
  risk.\*          → risk.calculated, quote.generated
  policy.\*        → policy.purchased, policy.activated, policy.claim.eligible
  endorsement.\*   → endorsement.created, endorsement.accepted, endorsement.rejected
  claim.\*         → claim.submitted, claim.approved, claim.rejected
  payment.\*       → payment.executed, payment.failed
  market.\*        → market.price.updated, market.threshold.breached
  audit.\*         → audit.event (catch-all)
```

\---

## 5\. Reactive Architecture

### Reactive Flow Design

```
HTTP Request
     │
     ▼ (WebFlux DispatcherHandler)
Controller (returns Mono<T> or Flux<T>)
     │
     ▼ (non-blocking)
Service Layer (Mono/Flux chains)
     │
     ├──▶ R2DBC Repository (reactive SQL)
     │
     ├──▶ Redis ReactiveRedisTemplate (cache)
     │
     ├──▶ WebClient (inter-service calls)
     │
     ├──▶ RabbitMQ Reactive Publisher
     │
     └──▶ Mono<ResponseEntity<T>>
```

### Key Reactive Patterns Used

* `flatMap` for async DB lookups
* `zipWith` / `zip` for parallel data assembly
* `switchIfEmpty` for fallback paths
* `onErrorResume` for graceful degradation
* `filter` for business rule guards
* `expand` for recursive traversal (policy versions)
* `Flux.interval` for schedulers
* `Sinks.Many` for SSE broadcast
* `StepVerifier` in all tests

\---

## 6\. API Gateway Design

### Route Configuration

```yaml
Routes:
  /api/v1/auth/\*\*        → auth-service:9081
  /api/v1/users/\*\*       → user-service:8082
  /api/v1/kyc/\*\*         → kyc-service:8083
  /api/v1/portfolios/\*\*  → portfolio-service:8084
  /api/v1/underwriting/\*\*→ underwriting-service:8085
  /api/v1/policies/\*\*    → policy-service:8086
  /api/v1/endorsements/\*\*→ endorsement-service:8087
  /api/v1/market/\*\*      → market-oracle-service:8088
  /api/v1/simulation/\*\*  → market-simulation-service:8089
  /api/v1/claims/\*\*      → claims-service:8090
  /api/v1/payments/\*\*    → payment-service:8091
  /api/v1/notifications/\*\*→notification-service:8092
  /api/v1/audit/\*\*       → audit-service:8093
```

### Filters Applied Per Route

1. **JwtAuthenticationFilter** — validates Bearer token
2. **RoleAuthorizationFilter** — RBAC check per route
3. **RateLimitingFilter** — Redis-backed token bucket
4. **CorrelationIdFilter** — injects X-Correlation-Id
5. **AuditLoggingFilter** — logs request/response metadata
6. **GlobalExceptionHandler** — standardized error envelope

### Public Routes (no JWT required)

* `POST /api/v1/auth/register`
* `POST /api/v1/auth/login`
* `POST /api/v1/auth/refresh`
* `GET  /api/v1/actuator/health`

\---

## 7\. Service Communication Diagram

```
          ┌─────────────┐
          │ API Gateway │
          └──────┬──────┘
                 │ WebClient (internal)
    ┌────────────┼────────────────────────────────┐
    │            │                                │
┌───▼───┐   ┌───▼────────┐              ┌────────▼──────┐
│ auth  │   │ portfolio  │              │  underwriting │
│service│   │  service   │──────────────▶    service    │
└───────┘   └──────┬─────┘              └────────┬──────┘
                   │ (Event: PortfolioImported)   │ (Event: QuoteGenerated)
                   ▼                              ▼
            ┌──────────────┐           ┌──────────────────┐
            │market-oracle │           │  policy-service  │
            │   service    │           │                  │
            └──────┬───────┘           └────────┬─────────┘
                   │ (Event: ThresholdConfirmed) │ (Event: ClaimEligible)
                   └──────────────┬─────────────┘
                                  ▼
                          ┌───────────────┐
                          │ claims-service│
                          └───────┬───────┘
                                  │ (Event: ClaimApproved)
                                  ▼
                          ┌───────────────┐
                          │payment-service│
                          └───────┬───────┘
                                  │
                     ┌────────────┴────────────┐
                     ▼                         ▼
            ┌─────────────────┐     ┌──────────────────┐
            │notification-svc │     │   audit-service  │
            └─────────────────┘     └──────────────────┘
```

\---

## 8\. Database Design Summary

### PostgreSQL Strategy

* One logical database: `stock\_insurance\_db`
* Schema-per-service for isolation:

  * `auth\_schema`, `kyc\_schema`, `portfolio\_schema`
  * `underwriting\_schema`, `policy\_schema`, `endorsement\_schema`
  * `claims\_schema`, `payment\_schema`, `notification\_schema`
  * `audit\_schema`, `market\_schema`
* R2DBC connection pooling via `r2dbc-pool`
* Flyway manages migrations per service
* All tables include: `created\_at`, `updated\_at`, `created\_by`, `version`

### Key Tables

```
auth\_schema:       users, roles, user\_roles, refresh\_tokens, mfa\_configs
kyc\_schema:        kyc\_records, kyc\_documents, kyc\_reviews
portfolio\_schema:  portfolios, portfolio\_holdings, portfolio\_snapshots,
                   portfolio\_versions, portfolio\_change\_events
underwriting\_schema: risk\_assessments, quotes
policy\_schema:     policies, policy\_versions, policy\_baselines, coverage\_tranches
endorsement\_schema: endorsements, endorsement\_tranches
claims\_schema:     claims, claim\_reviews, claim\_calculations
payment\_schema:    payments, payment\_transactions
notification\_schema: notifications, notification\_templates
audit\_schema:      audit\_logs
market\_schema:     market\_prices, historical\_market\_prices,
                   market\_simulation\_sessions, market\_events, market\_replay\_configs
```

\---

## 9\. Policy Lifecycle State Machine

```
REGISTERED
    │ (KYC submitted)
    ▼
KYC\_PENDING
    │ (auto or manual approval)
    ▼
KYC\_APPROVED
    │ (portfolio uploaded)
    ▼
PORTFOLIO\_CONNECTED
    │ (underwriting run)
    ▼
QUOTE\_GENERATED
    │ (investor accepts + pays premium)
    ▼
POLICY\_PURCHASED
    │ (immediate)
    ▼
WAITING\_PERIOD\_ACTIVE ──── (5 years elapses) ────▶ PROTECTION\_ACTIVE
    │                                                      │
    │                                               PORTFOLIO\_MONITORING
    │                                                      │
    │                                           (portfolio change detected)
    │                                                      │
    │                                           REUNDERWRITING\_REQUIRED
    │                                                      │
    │                                            ENDORSEMENT\_CREATED
    │                                                      │
    │                              ┌────────────── ENDORSEMENT\_PENDING
    │                              │                       │
    │                   ENDORSEMENT\_REJECTED    ENDORSEMENT\_ACCEPTED
    │                   (original policy            │
    │                    unchanged)        NEW\_COVERAGE\_TRANCHE\_CREATED
    │                                      TRANCHE\_WAITING\_PERIOD\_ACTIVE
    │                                               │ (5 years)
    │                                      TRANCHE\_PROTECTION\_ACTIVE
    │                                               │
    │                              (threshold breach + 5min confirmation)
    │                                               │
    └──────────────────────────────────── CLAIM\_ELIGIBLE
                                                   │
                                      (investor submits claim)
                                                   │
                                          CLAIM\_SUBMITTED
                                                   │
                                            VALIDATING
                                         ┌─────┴──────┐
                                     APPROVED    MANUAL\_REVIEW
                                     REJECTED         │
                                         │        (analyst reviews)
                                   PAYMENT\_EXECUTED  APPROVED/REJECTED
                                         │
                                      EXPIRED
                                         │
                                   AUDIT\_CLOSED
```

\---

## 10\. Claim Lifecycle

```
Investor Submits Claim
         │
         ▼
  \[Claim Received] ──── store in DB, assign claimId
         │
         ▼
  \[Validate Policy Status]
  ├── ACTIVE? → continue
  └── NOT ACTIVE? → REJECT
         │
         ▼
  \[Validate Waiting Period]
  ├── Current Date >= Policy Eligibility Date? → continue
  └── Waiting period incomplete? → REJECT
         │
         ▼
  \[Identify Eligible Tranches]
  ├── For each tranche: Current Date >= tranche.eligibilityDate?
  ├── ELIGIBLE tranches → include in calculation
  └── INELIGIBLE tranches → exclude
         │
         ▼
  \[Validate Threshold Breach]
  ├── Loss% >= insured threshold? → continue
  └── Not breached? → REJECT
         │
         ▼
  \[Calculate Loss from Eligible Tranches Only]
  Payout = Σ (tranche\_loss × tranche\_coverage\_percentage)
         │
         ▼
  \[Fraud Detection Rules]
  ├── Rapid claim (< 30 days post-eligibility)? → FLAG
  ├── Loss pattern anomaly? → FLAG
  ├── Multiple claims in short window? → FLAG
  └── Clean → AUTO\_APPROVE / MANUAL\_REVIEW
         │
         ▼
  \[Decision]
  ├── AUTO\_APPROVED → Payment Service
  ├── MANUAL\_REVIEW → Claims Analyst Queue
  └── REJECTED → Notification Service
         │
         ▼
  \[Payment Executed] → Audit Log → Notification
```

\---

## 11\. Endorsement Lifecycle

```
Portfolio Change Detected (by portfolio-service)
         │
         ▼
Portfolio Changed Event Published
         │
         ▼
endorsement-service consumes event
         │
         ▼
Re-Underwriting Triggered
  - New holdings analyzed
  - Risk score recalculated for entire portfolio
  - Delta identified (new assets vs. original)
         │
         ▼
Endorsement Proposal Created
  - originalPolicyId
  - newAssets\[]
  - newRiskScore
  - newCoveragePercentage
  - newPremiumPercentage
  - additionalPremium
  - newTrancheDefinition
         │
         ▼
Investor Notified
         │
         ▼
  ┌──────┴──────────────────────┐
  │                             │
ACCEPTED                    REJECTED
  │                             │
  ▼                             ▼
New Coverage Tranche Created   Original Policy Unchanged
  - effectiveDate = today       Newly added assets = NOT COVERED
  - waitingPeriod = 5 years
  - eligibilityDate = today + 5y
  - coveragePercentage (new)
  - premiumPercentage (new)
  │
  ▼
Additional Premium Charged
  │
  ▼
Policy Updated with new tranche
  │
  ▼
Audit Log
```

\---

## 12\. Coverage Tranche Design

```
Policy (policies table)
  │
  └──▶ Tranche 1 (Original — policy purchase)
         effectiveDate: 2027-01-01
         waitingPeriodYears: 5
         eligibilityDate: 2032-01-01
         assets: \[AAPL, MSFT, TSLA]
         riskScore: 350
         coveragePercentage: 85%
         premiumPercentage: 1.5%
         insuredValue: ₹150,000
         status: ACTIVE
  │
  └──▶ Tranche 2 (Endorsement 1 — NVDA added)
         effectiveDate: 2030-01-01
         waitingPeriodYears: 5
         eligibilityDate: 2035-01-01
         assets: \[NVDA]
         riskScore: 420
         coveragePercentage: 70%
         premiumPercentage: 3.0%
         insuredValue: ₹50,000
         status: WAITING\_PERIOD

Claim submitted: 2033-01-01
  → Tranche 1: ELIGIBLE (2033 >= 2032)  ✓
  → Tranche 2: INELIGIBLE (2033 < 2035) ✗
  → Payout calculated from Tranche 1 assets only
```

\---

## 13\. Risk Score Engine Design

### Formula

```
Risk Score (0–1000) =
  (Portfolio Volatility Score   × 0.40) +
  (Concentration Risk Score     × 0.20) +
  (Historical Drawdown Score    × 0.15) +
  (Liquidity Risk Score         × 0.10) +
  (Market Stress Index          × 0.10) +
  (Platform Exposure Score      × 0.05)
```

### Component Calculations

**Portfolio Volatility (0–1000)**

* Computed from 252-day rolling std dev of daily returns
* Uses internal `historical\_market\_prices` table
* Annualized: σ × √252
* Scaled: min(σ\_annual / 0.80, 1.0) × 1000

**Concentration Risk (0–1000)**

* Herfindahl-Hirschman Index (HHI) of portfolio weights
* HHI = Σ(weight\_i²)
* Scaled: HHI × 1000

**Historical Drawdown (0–1000)**

* Maximum drawdown from internal dataset
* Max Drawdown = (Peak − Trough) / Peak
* Scaled: MDD × 1000

**Liquidity Risk (0–1000)**

* Based on average daily trading volume from internal data
* Low volume = high liquidity risk
* Score = (1 - normalized\_avg\_volume) × 1000

**Market Stress Index (0–1000)**

* VIX proxy computed from internal simulation data
* Based on cross-asset correlation spikes
* Scaled 0–1000

**Platform Exposure (0–1000)**

* % of insured portfolio vs. total platform insured value
* Score = (portfolio\_insured / total\_platform\_insured) × 1000
* Capped at 1000

\---

## 14\. Market Simulation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           market-simulation-service                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Historical Data Import                               │   │
│  │  - CSV bulk import via admin endpoint               │   │
│  │  - Stored in historical\_market\_prices table         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Market Replay Engine                                 │   │
│  │  - Replays historical date ranges                   │   │
│  │  - Configurable speed multiplier (1x, 10x, 100x)    │   │
│  │  - Publishes MarketPriceUpdated events               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Synthetic Price Generator                            │   │
│  │  - Geometric Brownian Motion (GBM)                  │   │
│  │  - Configurable drift (μ) and volatility (σ)        │   │
│  │  - Scenario overlays (crash, bear, bull)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Scenario Library                                     │   │
│  │  - 2008 Financial Crisis (Sep 2008 – Mar 2009)      │   │
│  │  - 2020 COVID Crash (Feb 2020 – Apr 2020)           │   │
│  │  - Bear Market (μ = -0.25, σ = 0.30)                │   │
│  │  - Bull Market (μ = +0.20, σ = 0.15)                │   │
│  │  - Custom Scenario (user-defined parameters)         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                │ MarketPriceUpdated Event
                ▼
┌─────────────────────────────────────────────────────────────┐
│           market-oracle-service                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Price Cache (Redis)                                  │   │
│  │  key: market:price:{symbol}                         │   │
│  │  TTL: 5 minutes                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Portfolio Revaluation Scheduler (every 5 min)        │   │
│  │  - Fetch all active policy portfolios               │   │
│  │  - Get current prices from cache                    │   │
│  │  - Calculate current value                          │   │
│  │  - Calculate loss vs. baseline                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Threshold Evaluation Engine                          │   │
│  │  - Is loss% >= insured threshold?                   │   │
│  │  - If YES → record timestamp                        │   │
│  │  - 5 consecutive checks breached? → CONFIRM         │   │
│  │  - Flash crash guard: any recovery? → RESET         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

\---

## 15\. OCR KYC Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    kyc-service                              │
│                                                             │
│  1. Document Upload (Multipart)                             │
│     POST /api/v1/kyc/upload                                 │
│     - PAN Card Image                                        │
│     - Aadhaar Card Image                                    │
│     - Stored as binary in kyc\_documents                     │
│                                                             │
│  2. OCR Processing (Tesseract)                              │
│     - tesseract-ocr Java wrapper                            │
│     - Extract text from image                               │
│     - PAN: regex \[A-Z]{5}\[0-9]{4}\[A-Z]{1}                 │
│     - Aadhaar: 12-digit number                              │
│     - Name extraction via NLP pattern                       │
│                                                             │
│  3. Validation Engine                                       │
│     - PAN regex check                                       │
│     - Aadhaar Luhn-style checksum                           │
│     - Name similarity (Levenshtein) vs. user profile        │
│     - Confidence Score (0–100%)                             │
│       = 0.4×(pan\_valid) + 0.3×(aadhaar\_valid) +            │
│         0.3×(name\_match\_score)                              │
│                                                             │
│  4. Decision Engine                                         │
│     - confidence >= 95% → AUTO\_APPROVE                      │
│     - confidence < 95%  → MANUAL\_REVIEW                     │
│     - Analyst reviews via PATCH /api/v1/kyc/{id}/review     │
│                                                             │
│  5. KYC Approval Event Published                            │
│     → notification-service (email)                          │
│     → audit-service (log)                                   │
│     → user-service (status update)                          │
└─────────────────────────────────────────────────────────────┘
```

\---

## 16\. Portfolio Monitoring Architecture

```
Scheduler (every 5 minutes)
         │
         ▼
Fetch all PROTECTION\_ACTIVE policies
         │
         ▼
For each policy:
  ├── Fetch portfolio holdings
  ├── Fetch current prices from market-oracle (Redis cache)
  ├── Calculate current portfolio value = Σ(quantity × currentPrice)
  ├── Fetch baseline value from policy\_baselines
  ├── Calculate loss = baseline\_value - current\_value
  ├── Calculate loss% = (loss / baseline\_value) × 100
  │
  ├── \[Portfolio Change Detection]
  │     Compare current holdings vs. last snapshot
  │     ├── New symbols detected? → PortfolioChangedEvent
  │     ├── Quantity changes? → PortfolioChangedEvent
  │     └── No change? → continue
  │
  └── \[Threshold Evaluation]
        Is loss% >= policy.insuredThreshold?
        ├── YES → record breach\_timestamp
        │         increment consecutive\_breach\_count
        │         IF consecutive\_breach\_count >= 5 (25 mins) → skip
        │         Actually: 5-minute window = check at t=0,5,10,15,20
        │         IF all 5 checks breached → ThresholdConfirmed event
        └── NO  → reset consecutive\_breach\_count
                  (flash crash protection)
```

\---

## 17\. Security Architecture

```
                    ┌──────────────────────────────────────┐
                    │        Spring Security Chain          │
                    │                                       │
                    │  1. CORS Filter                       │
                    │  2. JWT Authentication Filter         │
                    │     (validate signature + expiry)     │
                    │  3. Role Extraction Filter            │
                    │     (populate SecurityContext)        │
                    │  4. Method-Level @PreAuthorize        │
                    │  5. CSRF (disabled for JWT APIs)      │
                    └──────────────────────────────────────┘

JWT Token Structure:
{
  "sub": "user-uuid",
  "email": "investor@example.com",
  "roles": \["ROLE\_INVESTOR"],
  "iat": 1700000000,
  "exp": 1700003600,
  "jti": "unique-token-id"
}

MFA Flow:
  Login → credentials valid? → MFA required?
    → Generate TOTP secret (Google Authenticator compatible)
    → User enters 6-digit OTP
    → Verify with TOTP library
    → Issue JWT

RBAC Matrix:
  Route Pattern                    | INVESTOR | UNDERWRITER | CLAIMS\_ANALYST | ADMIN | COMPLIANCE
  /api/v1/portfolios/\*\*            |   ✓      |     ✓       |               |   ✓   |
  /api/v1/underwriting/quote       |   ✓      |     ✓       |               |   ✓   |
  /api/v1/policies/\*\*              |   ✓      |     ✓       |      ✓        |   ✓   |   ✓
  /api/v1/claims/\*\*                |   ✓      |             |      ✓        |   ✓   |   ✓
  /api/v1/claims/{id}/review       |          |             |      ✓        |   ✓   |
  /api/v1/audit/\*\*                 |          |             |               |   ✓   |   ✓
  /api/v1/kyc/review               |          |             |               |   ✓   |
  /api/v1/simulation/\*\*            |          |             |               |   ✓   |
```

\---

## 18\. Redis Strategy

|Cache Key|Data|TTL|
|-|-|-|
|`market:price:{symbol}`|Latest price (BigDecimal)|5 minutes|
|`portfolio:summary:{portfolioId}`|Current value, loss%|5 minutes|
|`quote:{quoteId}`|Full quote object|24 hours|
|`risk:{portfolioId}`|Risk assessment result|1 hour|
|`session:{userId}`|JWT session metadata|JWT expiry|
|`mfa:secret:{userId}`|TOTP secret|30 minutes|
|`ratelimit:{ip}:{route}`|Token bucket counter|1 minute|
|`threshold:breach:{policyId}`|Breach start timestamp + count|30 minutes|

\---

## 19\. Deployment Architecture (Docker Compose)

```
docker-compose network: stock-insurance-network

Services:
  postgres:5432
  redis:6379
  rabbitmq:5672, 15672 (management)
  api-gateway:9070
  auth-service:9081
  user-service:8082
  kyc-service:8083
  portfolio-service:8084
  underwriting-service:8085
  policy-service:8086
  endorsement-service:8087
  market-oracle-service:8088
  market-simulation-service:8089
  claims-service:8090
  payment-service:8091
  notification-service:8092
  audit-service:8093
```

\---

## 20\. ER Diagram Summary

See `docs/architecture/02-er-diagram.md` for full ER diagram.

Key relationships:

* `users` → `kyc\_records` (1:1)
* `users` → `portfolios` (1:N)
* `portfolios` → `portfolio\_holdings` (1:N)
* `portfolios` → `portfolio\_snapshots` (1:N)
* `portfolios` → `portfolio\_versions` (1:N)
* `risk\_assessments` → `portfolios` (N:1)
* `quotes` → `risk\_assessments` (N:1)
* `policies` → `quotes` (1:1)
* `policies` → `coverage\_tranches` (1:N)
* `policies` → `policy\_versions` (1:N)
* `policies` → `policy\_baselines` (1:N)
* `endorsements` → `policies` (N:1)
* `endorsements` → `coverage\_tranches` (1:1)
* `claims` → `policies` (N:1)
* `claim\_reviews` → `claims` (1:N)
* `payments` → `claims` (1:1)
* `audit\_logs` → all entities (event-based)

