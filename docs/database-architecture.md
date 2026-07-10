# Wallet Database Architecture

> **Version:** 1.0.0  
> **Engine:** PostgreSQL 16+ with Drizzle ORM  
> **Style:** snake_case, UUID PKs, monetary fields as `NUMERIC(15,2)`  
> **Target:** Production digital wallet supporting auth, wallets, ledger, UPI, cards, merchants, rewards, documents, transport, AI, notifications, security, fraud, reporting, analytics

---

## Table of Contents

1. [Domain Diagram](#1-domain-diagram)
2. [ER Diagram](#2-er-diagram)
3. [Folder Structure](#3-folder-structure)
4. [Domain Dependency Graph](#4-domain-dependency-graph)
5. [Migration Order](#5-migration-order)
6. [Complete Table Inventory](#6-complete-table-inventory)
7. [Complete Enum Inventory](#7-complete-enum-inventory)
8. [Table-by-Table Descriptions](#8-table-by-table-descriptions)
9. [Foreign Key Relationships](#9-foreign-key-relationships)
10. [Index Strategy](#10-index-strategy)
11. [RLS Strategy](#11-rls-strategy)
12. [Partitioning Strategy](#12-partitioning-strategy)
13. [SQL Views](#13-sql-views)
14. [Materialized Views](#14-materialized-views)
15. [Event Bus Architecture](#15-event-bus-architecture)
16. [Ledger Architecture](#16-ledger-architecture)
17. [Merchant Architecture](#17-merchant-architecture)
18. [UPI Architecture](#18-upi-architecture)
19. [Card Architecture](#19-card-architecture)
20. [Authentication Architecture](#20-authentication-architecture)
21. [Session Lifecycle](#21-session-lifecycle)
22. [Payment Lifecycle](#22-payment-lifecycle)
23. [Fraud Architecture](#23-fraud-architecture)
24. [Analytics Architecture](#24-analytics-architecture)
25. [Reporting Architecture](#25-reporting-architecture)
26. [AI Architecture](#26-ai-architecture)
27. [Backup & Disaster Recovery](#27-backup--disaster-recovery)
28. [Security Model](#28-security-model)
29. [Compliance Considerations](#29-compliance-considerations)
30. [Final Total Table Count](#30-final-total-table-count)

---

## 1. Domain Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ┌──────────┐                            │
│                        │   AUTH   │                            │
│                        └────┬─────┘                            │
│                             │                                  │
│              ┌──────────────┼──────────────┐                   │
│              ▼              ▼              ▼                   │
│        ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│        │ WALLETS  │  │ SECURITY │  │   AI     │              │
│        └────┬─────┘  └──────────┘  └──────────┘              │
│             │                                                  │
│     ┌───────┼───────────┬───────────┬──────────┐              │
│     ▼       ▼           ▼           ▼          ▼              │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │ LEDGER │ │PAYMENTS│ │  CARDS  │ │  UPI   │ │TRANSPORT│     │
│ └────────┘ └───┬────┘ └────────┘ └────────┘ └────────┘       │
│                │                                               │
│     ┌──────────┼──────────┐                                   │
│     ▼          ▼          ▼                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐                              │
│ │MERCHANT│ │BENEF   │ │ DOCS   │                              │
│ └────────┘ └────────┘ └────────┘                              │
│                                                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│ │ REWARDS  │ │ NOTIF    │ │ FINANCE  │                        │
│ └──────────┘ └──────────┘ └──────────┘                        │
│                                                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│ │REPORTING │ │ANALYTICS │ │  SYSTEM  │                        │
│ └──────────┘ └──────────┘ └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

**Domain descriptions:**

| # | Domain | Purpose | Depends On |
|---|--------|---------|------------|
| 1 | Tenants | Multi-tenancy foundation | — |
| 2 | Auth | Users, sessions, devices, refresh tokens | Tenants |
| 3 | Wallets | User-facing wallet containers | Auth |
| 4 | Ledger | Double-entry accounting, immutable audit trail | Wallets |
| 5 | Payments | Payment intents, transaction metadata | Ledger, Wallets |
| 6 | Merchants | Merchant onboarding, locations, terminals, settlements | Ledger |
| 7 | UPI | UPI handles, accounts, collect requests, mandates | Wallets, Ledger |
| 8 | Cards | Physical/virtual cards, network tokens, artwork | Wallets |
| 9 | Beneficiaries | Saved beneficiaries | Wallets |
| 10 | Documents | Document storage, KYC verification | Auth |
| 11 | Transport | Transport cards, usage, fare capping | Wallets |
| 12 | Rewards | Reward programs, balances, rules | Ledger, Wallets |
| 13 | Notifications | Templates, queue, delivery, preferences | Auth |
| 14 | Security | Audit logs, security events, fraud detection | Auth |
| 15 | AI | AI insights, prompts, model versioning | Ledger, Transactions |
| 16 | Finance | Fee schedules, settlements, reconciliation | Ledger |
| 17 | Reporting | Aggregated business metrics | All domains |
| 18 | Analytics | Product analytics events, sessions | Auth |
| 19 | System | Jobs, feature flags, outbox, config | — |

---

## 2. ER Diagram

```
TENANTS
│
└──< USERS ──────< SESSIONS
│    │                 │
│    │                 └───< REFRESH_TOKENS
│    │
│    ├──< REGISTERED_DEVICES
│    ├──< LOGIN_ATTEMPTS
│    ├──< WALLETS ──< WALLET_BALANCES
│    │    │
│    │    ├──< ACCOUNT_LINKS >──┐
│    │    │                     │
│    │    ├──< TRANSACTIONS     │
│    │    │    │                │
│    │    │    └──< TRANSACTION_ITEMS
│    │    │
│    │    ├──< PAYMENT_INTENTS
│    │    │         │
│    │    │         ├──< UPI_COLLECT_REQUESTS
│    │    │         └──< UPI_MANDATES
│    │    │
│    │    ├──< CARDS
│    │    │    ├──< PHYSICAL_CARDS
│    │    │    ├──< VIRTUAL_CARDS
│    │    │    └──< NETWORK_TOKENS
│    │    │
│    │    ├──< CARD_ARTWORK
│    │    ├──< UPI_HANDLES
│    │    ├──< UPI_ACCOUNTS
│    │    ├──< UPI_DEVICES
│    │    ├──< BENEFICIARIES
│    │    ├──< TRANSPORT_CARDS
│    │    ├──< TRANSPORT_USAGE
│    │    └──< FARE_CAPPING
│    │
│    ├──< DOCUMENTS
│    ├──< DOCUMENT_VERIFICATIONS
│    ├──< NOTIFICATION_PREFERENCES
│    │
│    └──< FRAUD_ALERTS

ACCOUNTS (LEDGER)
│
├──< LEDGER_ENTRIES (append-only, double-entry)
│    │
│    └──< LEDGER_REVERSALS
│
└──< ACCOUNT_BALANCES

MERCHANTS ──< MERCHANT_LOCATIONS
│    │            │
│    │            └──< MERCHANT_TERMINALS
│    │
│    ├──< MERCHANT_SETTLEMENTS
│    └──< MERCHANT_CATEGORIES

REWARD_PROGRAMS ──< REWARD_BALANCES
│                      │
│                      └──< REWARD_TRANSACTIONS
│
└──< REWARD_RULES

NOTIFICATION_TEMPLATES
│
└──< NOTIFICATION_QUEUE
     │
     └──< NOTIFICATION_DELIVERY

AUDIT_LOGS
SECURITY_EVENTS
FRAUD_RULES
FRAUD_ALERTS

AI_MODELS ──< AI_PROMPTS ──< AI_RESPONSES
                              │
                              └──< AI_INSIGHTS

FEE_SCHEDULES ──< FEE_TRANSACTIONS

SETTLEMENT_BATCHES
RECONCILIATION_RECORDS

SYSTEM:
  JOB_DEFINITIONS ──< JOB_RUNS
  FEATURE_FLAGS ──< FEATURE_ROLLOUTS ──< FEATURE_AUDIENCES
  OUTBOX_EVENTS
  CONFIG (KV)
  IDEMPOTENCY_KEYS (KV)
  DAILY_WALLET_METRICS
  DAILY_TRANSACTION_METRICS
  MERCHANT_METRICS
  FRAUD_METRICS
  ANALYTICS_EVENTS
  ANALYTICS_SESSIONS
```

---

## 3. Folder Structure

```
lib/db/src/
├── schema/
│   ├── index.ts                         # Barrel re-export
│   ├── enums.ts                         # Shared PostgreSQL enum types
│   ├── tenants.ts                       # Multi-tenancy
│   ├── auth.ts                          # Users, sessions, devices, refresh tokens, login_attempts
│   ├── wallets.ts                       # Wallets, wallet_balances, account_links
│   ├── ledger/
│   │   ├── accounts.ts                  # Ledger accounts
│   │   ├── entries.ts                   # Ledger entries (append-only)
│   │   ├── reversals.ts                 # Reversing entries
│   │   └── balances.ts                  # Account balances (materialized)
│   ├── merchants.ts                     # Merchants, locations, terminals, settlements, categories
│   ├── upi.ts                           # UPI handles, accounts, collect requests, mandates, devices
│   ├── cards/
│   │   ├── cards.ts                     # Base card
│   │   ├── physical.ts                  # Physical card details
│   │   ├── virtual.ts                   # Virtual card details
│   │   ├── network_tokens.ts            # Network tokens (tokenization)
│   │   └── artwork.ts                   # Card artwork/themes
│   ├── payment/
│   │   ├── intents.ts                   # Payment intents
│   │   ├── transactions.ts              # Transaction metadata + items
│   │   └── methods.ts                   # Saved payment methods
│   ├── beneficiaries.ts                 # Saved beneficiaries
│   ├── documents.ts                     # Documents and verifications
│   ├── transport.ts                     # Transport cards, usage, fare capping
│   ├── rewards.ts                       # Reward programs, balances, transactions, rules
│   ├── notifications.ts                 # Templates, queue, delivery, preferences
│   ├── security/
│   │   ├── audit_logs.ts                # Audit logs
│   │   ├── security_events.ts           # Security events
│   │   ├── fraud_rules.ts               # Fraud detection rules
│   │   └── fraud_alerts.ts              # Fraud alerts
│   ├── ai.ts                            # AI models, prompts, responses, insights
│   ├── finance.ts                       # Fee schedules, transactions, settlements, reconciliation
│   ├── reporting.ts                     # Daily metrics tables
│   ├── analytics.ts                     # Analytics events and sessions
│   └── system/
│       ├── jobs.ts                      # Job definitions and runs
│       ├── features.ts                  # Feature flags, rollouts, audiences
│       ├── outbox.ts                    # Outbox events (event bus)
│       ├── config.ts                    # Key-value config
│       └── idempotency.ts              # Idempotency keys
├── migrations/                          # Drizzle generated migrations
│   ├── 0000_enums/
│   ├── 0001_tenants/
│   ├── 0002_auth/
│   ├── ...
│   └── 0024_rls/
├── seeds/
│   ├── merchant_categories.ts
│   ├── reward_programs.ts
│   └── feature_flags.ts
└── views/
    ├── wallet_summary.sql
    ├── user_dashboard.sql
    ├── monthly_spending.sql
    ├── reward_summary.sql
    └── notification_overview.sql
```
## 4. Domain Dependency Graph

```
Level 0 (Foundation):
  Tenants ──────────────────────────────────────────────┐
  Enums ────────────────────────────────────────────────┤
  System (jobs, features, config, idempotency) ─────────┤
                                                         │
Level 1 (Core Identity):                                 │
  Auth (users, sessions, devices, tokens) ───────────────┤
  Security (audit logs, security events) ────────────────┤
                                                         │
Level 2 (Financial Primitives):                          │
  Wallets (wallets, balances, links) ◄───────────────────┤
  Ledger (accounts, entries) ◄───────────────────────────┤
                                                         │
Level 3 (Payment Methods):                               │
  Payments (intents, transactions, methods) ◄────────────┤
  Cards (physical, virtual, tokens, artwork) ◄───────────┤
  UPI (handles, accounts, collect, mandates) ◄───────────┤
  Merchants (locations, terminals, settlements) ◄────────┤
  Beneficiaries ◄────────────────────────────────────────┤
                                                         │
Level 4 (Value-Add Services):                            │
  Transport (cards, usage, fare capping) ◄───────────────┤
  Rewards (programs, balances, rules) ◄──────────────────┤
  Documents (verifications) ◄────────────────────────────┤
                                                         │
Level 5 (Communication):                                 │
  Notifications (templates, queue, delivery) ◄───────────┤
                                                         │
Level 6 (Intelligence):                                  │
  AI (insights, prompts, model versioning) ◄─────────────┤
  Fraud (rules, alerts) ◄────────────────────────────────┤
  Finance (fees, settlements, reconciliation) ◄──────────┤
                                                         │
Level 7 (Aggregation):                                   │
  Reporting (daily metrics) ◄────────────────────────────┘
  Analytics (events, sessions)
```

Migration must follow these levels with no circular dependencies.

---

## 5. Migration Order

| Order | Migration ID | Domain | Tables Added | Depends On |
|-------|-------------|--------|-------------|------------|
| 001 | `0000_enums` | System | 0 (creates 48 enum types) | — |
| 002 | `0001_tenants` | Tenants | 1 (`tenants`) | 001 |
| 003 | `0002_auth` | Auth | 5 (`users`, `sessions`, `registered_devices`, `refresh_tokens`, `login_attempts`) | 002 |
| 004 | `0003_system` | System | 5 (`job_definitions`, `job_runs`, `config`, `idempotency_keys`, `outbox_events`) | 001 |
| 005 | `0004_features` | System | 3 (`feature_flags`, `feature_rollouts`, `feature_audiences`) | 004 |
| 006 | `0005_wallets` | Wallets | 3 (`wallets`, `wallet_balances`, `account_links`) | 003 |
| 007 | `0006_ledger` | Ledger | 4 (`accounts`, `ledger_entries`, `ledger_reversals`, `account_balances`) | 006 |
| 008 | `0007_merchants` | Merchants | 5 (`merchants`, `merchant_locations`, `merchant_terminals`, `merchant_settlements`, `merchant_categories`) | 007 |
| 009 | `0008_payments` | Payments | 4 (`payment_intents`, `transactions`, `transaction_items`, `payment_methods`) | 006, 007 |
| 010 | `0009_cards` | Cards | 5 (`cards`, `physical_cards`, `virtual_cards`, `network_tokens`, `card_artwork`) | 006 |
| 011 | `0010_upi` | UPI | 5 (`upi_handles`, `upi_accounts`, `upi_collect_requests`, `upi_mandates`, `upi_devices`) | 006, 007 |
| 012 | `0011_beneficiaries` | Beneficiaries | 1 (`beneficiaries`) | 006 |
| 013 | `0012_documents` | Documents | 2 (`documents`, `document_verifications`) | 003 |
| 014 | `0013_transport` | Transport | 3 (`transport_cards`, `transport_usage`, `fare_capping`) | 006 |
| 015 | `0014_rewards` | Rewards | 4 (`reward_programs`, `reward_balances`, `reward_transactions`, `reward_rules`) | 006, 007 |
| 016 | `0015_notifications` | Notifications | 4 (`notification_templates`, `notification_queue`, `notification_delivery`, `notification_preferences`) | 003 |
| 017 | `0016_security` | Security | 4 (`audit_logs`, `security_events`, `fraud_rules`, `fraud_alerts`) | 003, 006 |
| 018 | `0017_ai` | AI | 4 (`ai_models`, `ai_prompts`, `ai_responses`, `ai_insights`) | 009, 006 |
| 019 | `0018_finance` | Finance | 4 (`fee_schedules`, `fee_transactions`, `settlement_batches`, `reconciliation_records`) | 006, 007, 008 |
| 020 | `0019_reporting` | Reporting | 4 (`daily_wallet_metrics`, `daily_transaction_metrics`, `merchant_metrics`, `fraud_metrics`) | 006, 007, 008, 009, 017 |
| 021 | `0020_analytics` | Analytics | 2 (`analytics_events`, `analytics_sessions`) | 003 |
| 022 | `0021_partitions` | System | 0 (creates partitioned table attachments) | 007, 008, 009 |
| 023 | `0022_indexes` | System | 0 (creates additional indexes) | All |
| 024 | `0023_views` | System | 0 (creates SQL views + materialized views) | All |
| 025 | `0024_rls` | System | 0 (enables RLS + policies) | All |

**Total migrations: 25**

---

## 6. Complete Table Inventory

### 6.1 Tenants Domain (1 table)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 1 | `tenants` | public | No | 10 |

### 6.2 Auth Domain (5 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 2 | `users` | public | No | 10M |
| 3 | `sessions` | public | No | 50M |
| 4 | `registered_devices` | public | No | 15M |
| 5 | `refresh_tokens` | public | No | 200M |
| 6 | `login_attempts` | public | Yes (monthly) | 500M |

### 6.3 Wallets Domain (3 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 7 | `wallets` | public | No | 12M |
| 8 | `wallet_balances` | public | No | 36M |
| 9 | `account_links` | public | No | 12M |

### 6.4 Ledger Domain (4 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 10 | `accounts` | public | No | 100K |
| 11 | `ledger_entries` | ledger | Yes (monthly) | 500M |
| 12 | `ledger_reversals` | ledger | No | 1M |
| 13 | `account_balances` | ledger | No | 1M |

### 6.5 Merchants Domain (5 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 14 | `merchants` | public | No | 100K |
| 15 | `merchant_locations` | public | No | 200K |
| 16 | `merchant_terminals` | public | No | 500K |
| 17 | `merchant_settlements` | public | No | 500K |
| 18 | `merchant_categories` | public | No | 2K |

### 6.6 Payments Domain (4 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 19 | `payment_intents` | public | Yes (monthly) | 200M |
| 20 | `transactions` | public | Yes (monthly) | 200M |
| 21 | `transaction_items` | public | Yes (monthly) | 400M |
| 22 | `payment_methods` | public | No | 20M |

### 6.7 Cards Domain (5 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 23 | `cards` | public | No | 20M |
| 24 | `physical_cards` | public | No | 5M |
| 25 | `virtual_cards` | public | No | 15M |
| 26 | `network_tokens` | public | No | 30M |
| 27 | `card_artwork` | public | No | 20K |

### 6.8 UPI Domain (5 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 28 | `upi_handles` | public | No | 10M |
| 29 | `upi_accounts` | public | No | 10M |
| 30 | `upi_collect_requests` | public | Yes (monthly) | 50M |
| 31 | `upi_mandates` | public | No | 5M |
| 32 | `upi_devices` | public | No | 10M |

### 6.9 Beneficiaries Domain (1 table)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 33 | `beneficiaries` | public | No | 10M |

### 6.10 Documents Domain (2 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 34 | `documents` | public | No | 10M |
| 35 | `document_verifications` | public | No | 10M |

### 6.11 Transport Domain (3 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 36 | `transport_cards` | public | No | 5M |
| 37 | `transport_usage` | public | Yes (monthly) | 100M |
| 38 | `fare_capping` | public | No | 5M |

### 6.12 Rewards Domain (4 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 39 | `reward_programs` | public | No | 100 |
| 40 | `reward_balances` | public | No | 10M |
| 41 | `reward_transactions` | public | Yes (monthly) | 100M |
| 42 | `reward_rules` | public | No | 500 |

### 6.13 Notifications Domain (4 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 43 | `notification_templates` | public | No | 500 |
| 44 | `notification_queue` | public | Yes (monthly) | 500M |
| 45 | `notification_delivery` | public | Yes (monthly) | 500M |
| 46 | `notification_preferences` | public | No | 10M |

### 6.14 Security Domain (4 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 47 | `audit_logs` | public | Yes (monthly) | 1B |
| 48 | `security_events` | public | Yes (monthly) | 200M |
| 49 | `fraud_rules` | public | No | 500 |
| 50 | `fraud_alerts` | public | No | 5M |

### 6.15 AI Domain (4 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 51 | `ai_models` | public | No | 50 |
| 52 | `ai_prompts` | public | No | 1K |
| 53 | `ai_responses` | public | Yes (monthly) | 10M |
| 54 | `ai_insights` | public | No | 50M |

### 6.16 Finance Domain (4 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 55 | `fee_schedules` | public | No | 500 |
| 56 | `fee_transactions` | public | Yes (monthly) | 50M |
| 57 | `settlement_batches` | public | No | 50K |
| 58 | `reconciliation_records` | public | No | 5M |

### 6.17 Reporting Domain (4 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 59 | `daily_wallet_metrics` | reporting | No | 4M |
| 60 | `daily_transaction_metrics` | reporting | No | 4M |
| 61 | `merchant_metrics` | reporting | No | 40K |
| 62 | `fraud_metrics` | reporting | No | 40K |

### 6.18 Analytics Domain (2 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 63 | `analytics_events` | analytics | Yes (monthly) | 1B |
| 64 | `analytics_sessions` | analytics | Yes (monthly) | 50M |

### 6.19 System Domain (8 tables)

| # | Table | Schema | Partitioned | Est. Rows (Y1) |
|---|-------|--------|-------------|-----------------|
| 65 | `job_definitions` | public | No | 200 |
| 66 | `job_runs` | public | Yes (monthly) | 1M |
| 67 | `feature_flags` | public | No | 200 |
| 68 | `feature_rollouts` | public | No | 500 |
| 69 | `feature_audiences` | public | No | 1K |
| 70 | `outbox_events` | public | Yes (monthly) | 500M |
| 71 | `config` | public | No | 1K |
| 72 | `idempotency_keys` | public | No | 10M |

**Total tables: 72**

---

## 7. Complete Enum Inventory

All enums as PostgreSQL native `CREATE TYPE` in migration `0000_enums`.

```sql
-- Auth Domain
CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE session_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE device_status AS ENUM ('active', 'revoked', 'suspended');
CREATE TYPE login_attempt_result AS ENUM ('success', 'invalid_otp', 'rate_limited', 'blocked');

-- Wallet Domain
CREATE TYPE wallet_status AS ENUM ('active', 'frozen', 'closed', 'dormant');
CREATE TYPE wallet_type AS ENUM ('personal', 'business', 'escrow', 'joint');
CREATE TYPE account_link_status AS ENUM ('active', 'inactive', 'removed');

-- Ledger Domain
CREATE TYPE account_type AS ENUM (
  'user_available', 'user_reserved', 'merchant', 'platform',
  'reward', 'fee', 'escrow', 'settlement',
  'bank_clearing', 'suspense'
);
CREATE TYPE account_status AS ENUM ('active', 'frozen', 'closed');
CREATE TYPE entry_side AS ENUM ('debit', 'credit');
CREATE TYPE entry_status AS ENUM ('pending', 'posted', 'reversed');

-- Merchant Domain
CREATE TYPE merchant_status AS ENUM ('pending', 'active', 'suspended', 'terminated');
CREATE TYPE merchant_verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE terminal_status AS ENUM ('active', 'inactive', 'faulted');
CREATE TYPE settlement_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Payments Domain
CREATE TYPE payment_intent_status AS ENUM (
  'created', 'authorized', 'captured', 'failed', 'cancelled', 'expired'
);
CREATE TYPE payment_method_type AS ENUM ('card', 'upi', 'netbanking', 'wallet', 'emandate');
CREATE TYPE transaction_type AS ENUM (
  'payment', 'refund', 'transfer', 'deposit', 'withdrawal',
  'fee', 'reward', 'settlement', 'reversal'
);
CREATE TYPE transaction_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'reversed', 'refunded', 'disputed'
);

-- Cards Domain
CREATE TYPE card_network AS ENUM ('visa', 'mastercard', 'rupay', 'amex', 'discover');
CREATE TYPE card_type AS ENUM ('physical', 'virtual', 'tokenized');
CREATE TYPE card_status AS ENUM ('active', 'frozen', 'cancelled', 'expired', 'lost', 'stolen');
CREATE TYPE card_issuer AS ENUM ('visa', 'mastercard', 'rupay', 'amex');
CREATE TYPE token_requestor AS ENUM ('apple_pay', 'google_pay', 'merchant', 'platform');

-- UPI Domain
CREATE TYPE upi_handle_type AS ENUM ('phone', 'email', 'aadhaar', 'custom', 'bank');
CREATE TYPE upi_account_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE collect_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'expired');
CREATE TYPE mandate_status AS ENUM ('active', 'paused', 'cancelled', 'expired');
CREATE TYPE mandate_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'as_presented');
CREATE TYPE upi_device_binding AS ENUM ('soft', 'hard', 'none');

-- Beneficiaries Domain
CREATE TYPE beneficiary_status AS ENUM ('active', 'inactive', 'removed');
CREATE TYPE beneficiary_type AS ENUM ('upi', 'bank_account', 'card');

-- Documents Domain
CREATE TYPE document_type AS ENUM ('aadhaar', 'pan', 'passport', 'driving_license', 'voter_id', 'bank_statement', 'income_proof', 'selfie', 'signature', 'other');
CREATE TYPE document_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE verification_method AS ENUM ('manual', 'ocr', 'digilocker', 'video', 'api');

-- Transport Domain
CREATE TYPE transport_mode AS ENUM ('bus', 'metro', 'train', 'ferry', 'toll');
CREATE TYPE fare_cap_period AS ENUM ('daily', 'weekly', 'monthly');

-- Rewards Domain
CREATE TYPE reward_type AS ENUM ('cashback', 'points', 'voucher', 'discount', 'tier_benefit');
CREATE TYPE reward_status AS ENUM ('active', 'paused', 'expired');
CREATE TYPE reward_transaction_type AS ENUM ('earned', 'redeemed', 'expired', 'adjusted', 'transferred');

-- Notifications Domain
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'sms', 'whatsapp', 'in_app');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'delivered', 'failed', 'clicked', 'read');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Security Domain
CREATE TYPE audit_action AS ENUM (
  'create', 'update', 'delete', 'login', 'logout',
  'transfer', 'payment', 'kyc_update', 'settings_change',
  'device_register', 'device_remove', 'session_revoke',
  'password_change', 'pin_change', 'biometric_toggle'
);
CREATE TYPE security_event_type AS ENUM (
  'suspicious_login', 'new_device', 'unusual_amount',
  'rapid_fire', 'geolocation_anomaly', 'tor_usage',
  'vpn_detected', 'credential_stuffing', 'session_hijack',
  'device_rooted', 'emulator_detected'
);
CREATE TYPE security_event_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE fraud_alert_status AS ENUM ('open', 'investigating', 'confirmed', 'false_positive', 'resolved');
CREATE TYPE fraud_alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- AI Domain
CREATE TYPE ai_provider AS ENUM ('openai', 'anthropic', 'google', 'aws', 'azure', 'self_hosted');
CREATE TYPE insight_category AS ENUM (
  'spending_pattern', 'budget_alert', 'savings_opportunity',
  'fraud_warning', 'cashflow_forecast', 'investment_suggestion',
  'reward_optimization', 'merchant_insight'
);

-- Finance Domain
CREATE TYPE fee_type AS ENUM ('fixed', 'percentage', 'tiered', 'blended');
CREATE TYPE fee_trigger AS ENUM ('transaction', 'withdrawal', 'card_issue', 'monthly', 'annual', 'late_payment');
CREATE TYPE settlement_batch_status AS ENUM ('draft', 'processing', 'completed', 'failed');

-- System Domain
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE job_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE feature_flag_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE rollout_strategy AS ENUM ('percentage', 'user_ids', 'audience', 'beta', 'gradual');
CREATE TYPE outbox_event_status AS ENUM ('pending', 'published', 'failed', 'dead_letter');
CREATE TYPE idempotency_status AS ENUM ('in_progress', 'completed', 'failed');
```

**Total enum types: 48**

---

## 8. Table-by-Table Descriptions

### 8.1 `tenants`

Multi-tenancy root. Each tenant represents an isolated organization. All major business tables reference `tenant_id`.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(255) | NOT NULL | |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | URL-friendly identifier |
| domain | VARCHAR(255) | | Custom domain |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | active, suspended, trial |
| plan | VARCHAR(50) | NOT NULL DEFAULT 'starter' | |
| settings | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.2 `users`

Central user registry. Each user belongs to one tenant.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | NOT NULL → tenants.id | |
| phone | VARCHAR(20) | NOT NULL | Unique per tenant |
| email | VARCHAR(255) | | Unique per tenant |
| name | VARCHAR(255) | | |
| avatar_url | TEXT | | |
| kyc_status | kyc_status | NOT NULL DEFAULT 'pending' | |
| kyc_verified_at | TIMESTAMPTZ | | |
| two_factor_enabled | BOOLEAN | NOT NULL DEFAULT FALSE | |
| biometric_enabled | BOOLEAN | NOT NULL DEFAULT TRUE | |
| pin_hash | VARCHAR(255) | | Transaction PIN |
| preferred_language | VARCHAR(10) | DEFAULT 'en' | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.3 `sessions`

Server-side session records bound to (user, device) pair.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| device_id | UUID | → registered_devices.id | |
| refresh_token_hash | VARCHAR(255) | | |
| ip_address | INET | | |
| user_agent | TEXT | | |
| status | session_status | NOT NULL DEFAULT 'active' | |
| last_active_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| expires_at | TIMESTAMPTZ | NOT NULL | 7-day TTL |
| revoked_at | TIMESTAMPTZ | | |
| revoked_by | VARCHAR(50) | | user, admin, system |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.4 `registered_devices`

Device enrollment for biometric binding and push notifications.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| device_name | VARCHAR(255) | | |
| device_identifier | VARCHAR(255) | NOT NULL | |
| device_type | VARCHAR(50) | | ios, android, web |
| push_token | TEXT | | |
| status | device_status | NOT NULL DEFAULT 'active' | |
| last_used_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| enrolled_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| revoked_at | TIMESTAMPTZ | | |

### 8.5 `refresh_tokens`

Refresh token rotation tracking.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| session_id | UUID | NOT NULL → sessions.id | |
| token_hash | VARCHAR(255) | NOT NULL | SHA-256 |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| used_at | TIMESTAMPTZ | | When rotated |
| replaced_by_token_id | UUID | → refresh_tokens.id | Next in chain |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.6 `login_attempts`

Rate-limiting and brute-force detection. Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| phone | VARCHAR(20) | NOT NULL | |
| result | login_attempt_result | NOT NULL | |
| ip_address | INET | | |
| device_identifier | VARCHAR(255) | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.7 `wallets`

User-facing wallet container. NOT the ledger.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| tenant_id | UUID | → tenants.id | |
| wallet_type | wallet_type | NOT NULL DEFAULT 'personal' | |
| name | VARCHAR(100) | NOT NULL | |
| status | wallet_status | NOT NULL DEFAULT 'active' | |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| daily_limit | NUMERIC(15,2) | | |
| monthly_limit | NUMERIC(15,2) | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.8 `wallet_balances`

Current balance per wallet per currency.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| wallet_id | UUID | NOT NULL → wallets.id | UNIQUE |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| available_balance | NUMERIC(15,2) | NOT NULL DEFAULT 0 | Spendable |
| reserved_balance | NUMERIC(15,2) | NOT NULL DEFAULT 0 | Pending holds |
| ledger_balance | NUMERIC(15,2) | NOT NULL DEFAULT 0 | available + reserved |
| last_ledger_entry_id | UUID | → ledger_entries.id | |
| version | INTEGER | NOT NULL DEFAULT 1 | Optimistic lock |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.9 `account_links`

Maps wallets to ledger accounts.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| wallet_id | UUID | NOT NULL → wallets.id | |
| account_id | UUID | NOT NULL → accounts.id | |
| account_type | account_type | NOT NULL | Which role |
| status | account_link_status | NOT NULL DEFAULT 'active' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.10 `accounts`

Financial ledger accounts. Never exposed directly to users.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| account_type | account_type | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| name | VARCHAR(255) | NOT NULL | |
| code | VARCHAR(50) | UNIQUE | Chart of accounts code |
| status | account_status | NOT NULL DEFAULT 'active' | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.11 `ledger_entries`

Immutable, append-only double-entry ledger. Partitioned by month on `booked_at`.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| account_id | UUID | NOT NULL → accounts.id | |
| entry_side | entry_side | NOT NULL | debit or credit |
| amount | NUMERIC(15,2) | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| correlation_id | UUID | NOT NULL | Pairs debit + credit |
| reversal_entry_id | UUID | → ledger_entries.id | If this is a reversal |
| reversed_by_entry_id | UUID | → ledger_entries.id | If this was reversed |
| status | entry_status | NOT NULL DEFAULT 'posted' | |
| description | TEXT | | |
| metadata | JSONB | DEFAULT '{}' | |
| booked_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Partition key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.12 `ledger_reversals`

Tracks reversal requests and approval workflow.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| original_entry_id | UUID | NOT NULL → ledger_entries.id | |
| reversal_entry_id | UUID | NOT NULL → ledger_entries.id | |
| reason | TEXT | NOT NULL | |
| approved_by | VARCHAR(255) | | |
| approved_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.13 `account_balances`

Materialized balance per account. Updated atomically with ledger entries.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| account_id | UUID | NOT NULL → accounts.id | UNIQUE |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| balance | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| last_entry_id | UUID | → ledger_entries.id | |
| version | INTEGER | NOT NULL DEFAULT 1 | Optimistic lock |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
### 8.14 `merchants` to 8.30 — Merchant, Payment, Card, and UPI tables

### 8.14 `merchants`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| name | VARCHAR(255) | NOT NULL | |
| legal_name | VARCHAR(255) | | |
| gstin | VARCHAR(20) | | |
| pan | VARCHAR(10) | | |
| category_id | UUID | → merchant_categories.id | |
| status | merchant_status | NOT NULL DEFAULT 'pending' | |
| verification_status | merchant_verification_status | NOT NULL DEFAULT 'unverified' | |
| contact_email | VARCHAR(255) | | |
| contact_phone | VARCHAR(20) | | |
| logo_url | TEXT | | |
| website | VARCHAR(255) | | |
| settlement_account_id | UUID | → accounts.id | |
| fee_schedule_id | UUID | → fee_schedules.id | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.15 `merchant_locations`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| merchant_id | UUID | NOT NULL → merchants.id | |
| name | VARCHAR(255) | | |
| address_line1 | TEXT | | |
| address_line2 | TEXT | | |
| city | VARCHAR(100) | | |
| state | VARCHAR(50) | | |
| postal_code | VARCHAR(20) | | |
| country | VARCHAR(50) | NOT NULL DEFAULT 'IN' | |
| coordinates | POINT | | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.16 `merchant_terminals`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| location_id | UUID | NOT NULL → merchant_locations.id | |
| terminal_id | VARCHAR(100) | NOT NULL | |
| model | VARCHAR(100) | | |
| status | terminal_status | NOT NULL DEFAULT 'active' | |
| last_heartbeat_at | TIMESTAMPTZ | | |
| firmware_version | VARCHAR(50) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.17 `merchant_settlements`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| merchant_id | UUID | NOT NULL → merchants.id | |
| batch_reference | VARCHAR(100) | NOT NULL | |
| settlement_account_id | UUID | → accounts.id | |
| amount | NUMERIC(15,2) | NOT NULL | |
| fee_amount | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| net_amount | NUMERIC(15,2) | NOT NULL | |
| transaction_count | INTEGER | NOT NULL DEFAULT 0 | |
| status | settlement_status | NOT NULL DEFAULT 'pending' | |
| settled_at | TIMESTAMPTZ | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.18 `merchant_categories`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| code | VARCHAR(10) | NOT NULL UNIQUE | MCC code |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| is_high_risk | BOOLEAN | NOT NULL DEFAULT FALSE | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.19 `payment_intents`

Lifecycle-driven payment requests. Every payment starts here. Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| wallet_id | UUID | NOT NULL → wallets.id | |
| tenant_id | UUID | → tenants.id | |
| amount | NUMERIC(15,2) | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| status | payment_intent_status | NOT NULL DEFAULT 'created' | |
| payment_method_type | payment_method_type | | |
| payment_method_id | UUID | → payment_methods.id | |
| merchant_id | UUID | → merchants.id | |
| description | TEXT | | |
| statement_descriptor | VARCHAR(100) | | |
| metadata | JSONB | DEFAULT '{}' | |
| expires_at | TIMESTAMPTZ | | |
| authorized_at | TIMESTAMPTZ | | |
| captured_at | TIMESTAMPTZ | | |
| failed_at | TIMESTAMPTZ | | |
| failure_reason | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.20 `transactions`

Business event metadata only — money movement is in ledger_entries. Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| payment_intent_id | UUID | → payment_intents.id | |
| wallet_id | UUID | NOT NULL → wallets.id | |
| tenant_id | UUID | → tenants.id | |
| transaction_type | transaction_type | NOT NULL | |
| status | transaction_status | NOT NULL | |
| amount | NUMERIC(15,2) | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| debit_account_id | UUID | → accounts.id | |
| credit_account_id | UUID | → accounts.id | |
| transaction_reference | VARCHAR(100) | NOT NULL UNIQUE | |
| provider_reference | VARCHAR(255) | | PSP reference |
| external_reference | VARCHAR(255) | | Merchant/bank ref |
| reconciliation_reference | VARCHAR(255) | | |
| description | TEXT | | |
| metadata | JSONB | DEFAULT '{}' | |
| ledger_correlation_id | UUID | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.21 `transaction_items`

Line items for multi-item purchases. Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| transaction_id | UUID | NOT NULL → transactions.id | |
| merchant_id | UUID | → merchants.id | |
| name | VARCHAR(255) | NOT NULL | |
| quantity | INTEGER | NOT NULL DEFAULT 1 | |
| unit_price | NUMERIC(15,2) | NOT NULL | |
| total_price | NUMERIC(15,2) | NOT NULL | |
| category | VARCHAR(100) | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.22 `payment_methods`

Saved payment method tokens.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| method_type | payment_method_type | NOT NULL | |
| display_name | VARCHAR(100) | | |
| network_token_id | UUID | → network_tokens.id | |
| upi_account_id | UUID | → upi_accounts.id | |
| is_default | BOOLEAN | NOT NULL DEFAULT FALSE | |
| is_expired | BOOLEAN | NOT NULL DEFAULT FALSE | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.23 `cards`

Base card record shared by physical and virtual cards.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| wallet_id | UUID | → wallets.id | |
| tenant_id | UUID | → tenants.id | |
| card_network | card_network | NOT NULL | |
| card_type | card_type | NOT NULL | |
| issuer | card_issuer | NOT NULL | |
| last_four | VARCHAR(4) | NOT NULL | |
| expiry_month | INTEGER | NOT NULL | |
| expiry_year | INTEGER | NOT NULL | |
| nickname | VARCHAR(100) | NOT NULL DEFAULT 'My Card' | |
| status | card_status | NOT NULL DEFAULT 'active' | |
| frozen | BOOLEAN | NOT NULL DEFAULT FALSE | |
| daily_limit | NUMERIC(15,2) | | |
| monthly_limit | NUMERIC(15,2) | | |
| artwork_id | UUID | → card_artwork.id | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.24 `physical_cards`

PCI DSS — encryption at rest required.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| card_id | UUID | NOT NULL → cards.id | UNIQUE |
| cardholder_name | VARCHAR(255) | NOT NULL | |
| encrypted_pan | TEXT | NOT NULL | AES-256 |
| pan_last_four | VARCHAR(4) | NOT NULL | |
| pan_hash | VARCHAR(255) | NOT NULL | SHA-256 |
| encrypted_cvv | TEXT | | AES-256 |
| card_funding | VARCHAR(20) | | credit/debit/prepaid |
| issued_at | TIMESTAMPTZ | NOT NULL | |
| activation_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.25 `virtual_cards`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| card_id | UUID | NOT NULL → cards.id | UNIQUE |
| encrypted_pan | TEXT | NOT NULL | |
| pan_last_four | VARCHAR(4) | NOT NULL | |
| pan_hash | VARCHAR(255) | NOT NULL | |
| encrypted_cvv | TEXT | | |
| is_single_use | BOOLEAN | NOT NULL DEFAULT FALSE | |
| is_merchant_locked | BOOLEAN | NOT NULL DEFAULT FALSE | |
| locked_merchant_id | UUID | → merchants.id | |
| expires_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.26 `network_tokens`

Card network tokenization (Apple Pay, Google Pay, merchant tokens).

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| card_id | UUID | NOT NULL → cards.id | |
| token_requestor | token_requestor | NOT NULL | |
| token_reference | VARCHAR(255) | NOT NULL | DPAN reference |
| encrypted_token | TEXT | NOT NULL | |
| token_expiry_month | INTEGER | | |
| token_expiry_year | INTEGER | | |
| device_id | UUID | → registered_devices.id | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.27 `card_artwork`

Card design themes.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL | |
| is_premium | BOOLEAN | NOT NULL DEFAULT FALSE | |
| gradient_colors | JSONB | NOT NULL | |
| pattern_url | TEXT | | |
| icon_url | TEXT | | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.28 `upi_handles`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| handle | VARCHAR(100) | NOT NULL UNIQUE | Full VPA |
| handle_type | upi_handle_type | NOT NULL | |
| is_primary | BOOLEAN | NOT NULL DEFAULT FALSE | |
| status | upi_account_status | NOT NULL DEFAULT 'active' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.29 `upi_accounts`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| wallet_id | UUID | → wallets.id | |
| handle_id | UUID | → upi_handles.id | |
| account_reference | VARCHAR(100) | NOT NULL | |
| masked_account_number | VARCHAR(25) | NOT NULL | |
| ifsc | VARCHAR(20) | NOT NULL | |
| bank_name | VARCHAR(100) | | |
| status | upi_account_status | NOT NULL DEFAULT 'active' | |
| is_primary | BOOLEAN | NOT NULL DEFAULT FALSE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.30 `upi_collect_requests`

UPI collect payment requests. Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| payment_intent_id | UUID | NOT NULL → payment_intents.id | |
| payer_handle | VARCHAR(100) | NOT NULL | |
| payee_handle | VARCHAR(100) | NOT NULL | |
| amount | NUMERIC(15,2) | NOT NULL | |
| description | TEXT | | |
| status | collect_request_status | NOT NULL DEFAULT 'pending' | |
| npci_transaction_id | VARCHAR(100) | | |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
### 8.31 `upi_mandates`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| wallet_id | UUID | → wallets.id | |
| payment_intent_id | UUID | → payment_intents.id | |
| merchant_id | UUID | → merchants.id | |
| umn | VARCHAR(100) | NOT NULL UNIQUE | Unique Mandate Number |
| amount | NUMERIC(15,2) | | Max per debit |
| frequency | mandate_frequency | NOT NULL | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | | |
| status | mandate_status | NOT NULL DEFAULT 'active' | |
| npci_mandate_id | VARCHAR(100) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.32 `upi_devices`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| device_identifier | VARCHAR(255) | NOT NULL | |
| binding_type | upi_device_binding | NOT NULL DEFAULT 'soft' | |
| app_version | VARCHAR(20) | | |
| os_version | VARCHAR(20) | | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.33 `beneficiaries`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| beneficiary_type | beneficiary_type | NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| masked_identifier | VARCHAR(100) | NOT NULL | |
| identifier_hash | VARCHAR(255) | NOT NULL | |
| ifsc | VARCHAR(20) | | |
| bank_name | VARCHAR(100) | | |
| status | beneficiary_status | NOT NULL DEFAULT 'active' | |
| transfer_limit | NUMERIC(15,2) | | |
| daily_limit | NUMERIC(15,2) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.34 `documents`

User documents for KYC.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| document_type | document_type | NOT NULL | |
| document_number_hash | VARCHAR(255) | | |
| masked_number | VARCHAR(50) | | Last 4 chars |
| file_url | TEXT | | Encrypted storage |
| file_hash | VARCHAR(255) | | |
| status | document_status | NOT NULL DEFAULT 'pending' | |
| expires_at | DATE | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.35 `document_verifications`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| document_id | UUID | NOT NULL → documents.id | |
| verification_method | verification_method | NOT NULL | |
| verified_by | VARCHAR(255) | | |
| is_approved | BOOLEAN | NOT NULL | |
| rejection_reason | TEXT | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.36 `transport_cards`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| wallet_id | UUID | NOT NULL → wallets.id | |
| transport_mode | transport_mode | NOT NULL | |
| card_reference | VARCHAR(100) | NOT NULL | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| auto_topup_enabled | BOOLEAN | NOT NULL DEFAULT FALSE | |
| auto_topup_threshold | NUMERIC(15,2) | | |
| auto_topup_amount | NUMERIC(15,2) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.37 `transport_usage`

Individual transport taps. Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| transport_card_id | UUID | NOT NULL → transport_cards.id | |
| transaction_id | UUID | → transactions.id | |
| mode | transport_mode | NOT NULL | |
| route | VARCHAR(100) | | |
| station_entry | VARCHAR(100) | | |
| station_exit | VARCHAR(100) | | |
| fare | NUMERIC(15,2) | NOT NULL | |
| tap_in_at | TIMESTAMPTZ | NOT NULL | |
| tap_out_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.38 `fare_capping`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| transport_mode | transport_mode | NOT NULL | |
| cap_period | fare_cap_period | NOT NULL | |
| period_start | DATE | NOT NULL | |
| period_end | DATE | NOT NULL | |
| total_fare | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| cap_amount | NUMERIC(15,2) | NOT NULL | |
| is_capped | BOOLEAN | NOT NULL DEFAULT FALSE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.39 `reward_programs`

Loyalty program definitions.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| reward_type | reward_type | NOT NULL | |
| status | reward_status | NOT NULL DEFAULT 'active' | |
| conversion_rate | NUMERIC(15,4) | | |
| start_date | TIMESTAMPTZ | | |
| end_date | TIMESTAMPTZ | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.40 `reward_balances`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| program_id | UUID | NOT NULL → reward_programs.id | |
| balance | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| lifetime_earned | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| lifetime_redeemed | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| expires_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.41 `reward_transactions`

Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| program_id | UUID | NOT NULL → reward_programs.id | |
| balance_id | UUID | NOT NULL → reward_balances.id | |
| transaction_type | reward_transaction_type | NOT NULL | |
| amount | NUMERIC(15,2) | NOT NULL | |
| reference_transaction_id | UUID | → transactions.id | |
| description | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.42 `reward_rules`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| program_id | UUID | NOT NULL → reward_programs.id | |
| name | VARCHAR(255) | NOT NULL | |
| trigger_event | VARCHAR(100) | NOT NULL | |
| conditions | JSONB | NOT NULL | |
| reward_amount | NUMERIC(15,2) | NOT NULL | |
| max_per_user | INTEGER | | |
| max_total | INTEGER | | |
| priority | INTEGER | NOT NULL DEFAULT 0 | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.43 `notification_templates`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL UNIQUE | |
| channel | notification_channel | NOT NULL | |
| subject | VARCHAR(255) | | |
| template_body | TEXT | NOT NULL | {{variable}} placeholders |
| variables | JSONB | NOT NULL | |
| metadata | JSONB | DEFAULT '{}' | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.44 `notification_queue`

Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| template_id | UUID | → notification_templates.id | |
| channel | notification_channel | NOT NULL | |
| priority | notification_priority | NOT NULL DEFAULT 'normal' | |
| context | JSONB | NOT NULL | |
| scheduled_at | TIMESTAMPTZ | | |
| max_retries | INTEGER | NOT NULL DEFAULT 3 | |
| retry_count | INTEGER | NOT NULL DEFAULT 0 | |
| status | notification_status | NOT NULL DEFAULT 'queued' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.45 `notification_delivery`

Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| notification_queue_id | UUID | NOT NULL → notification_queue.id | |
| channel | notification_channel | NOT NULL | |
| provider_message_id | VARCHAR(255) | | |
| status | notification_status | NOT NULL | |
| error_message | TEXT | | |
| delivered_at | TIMESTAMPTZ | | |
| read_at | TIMESTAMPTZ | | |
| clicked_at | TIMESTAMPTZ | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.46 `notification_preferences`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | UNIQUE |
| push_enabled | BOOLEAN | NOT NULL DEFAULT TRUE | |
| email_enabled | BOOLEAN | NOT NULL DEFAULT TRUE | |
| sms_enabled | BOOLEAN | NOT NULL DEFAULT FALSE | |
| whatsapp_enabled | BOOLEAN | NOT NULL DEFAULT FALSE | |
| quiet_hours_start | TIME | | |
| quiet_hours_end | TIME | | |
| muted_event_types | TEXT[] | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.47 `audit_logs`

Partitioned by month. Immutable compliance trail.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| user_id | UUID | → users.id | |
| session_id | UUID | → sessions.id | |
| action | audit_action | NOT NULL | |
| resource_type | VARCHAR(50) | NOT NULL | |
| resource_id | VARCHAR(255) | NOT NULL | |
| old_values | JSONB | | |
| new_values | JSONB | | |
| ip_address | INET | | |
| user_agent | TEXT | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.48 `security_events`

Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| user_id | UUID | → users.id | |
| event_type | security_event_type | NOT NULL | |
| severity | security_event_severity | NOT NULL | |
| ip_address | INET | | |
| device_id | UUID | → registered_devices.id | |
| location | POINT | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.49 `fraud_rules`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| rule_type | VARCHAR(50) | NOT NULL | |
| conditions | JSONB | NOT NULL | |
| action | VARCHAR(50) | NOT NULL | |
| priority | INTEGER | NOT NULL DEFAULT 0 | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.50 `fraud_alerts`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | → users.id | |
| rule_id | UUID | → fraud_rules.id | |
| transaction_id | UUID | → transactions.id | |
| alert_type | VARCHAR(50) | NOT NULL | |
| severity | fraud_alert_severity | NOT NULL | |
| status | fraud_alert_status | NOT NULL DEFAULT 'open' | |
| description | TEXT | | |
| metadata | JSONB | DEFAULT '{}' | |
| reviewed_by | VARCHAR(255) | | |
| reviewed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.51 `ai_models`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| provider | ai_provider | NOT NULL | |
| model_name | VARCHAR(100) | NOT NULL | |
| model_version | VARCHAR(50) | NOT NULL | |
| provider_version | VARCHAR(50) | NOT NULL | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| parameters | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.52 `ai_prompts`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL UNIQUE | |
| prompt_version | VARCHAR(10) | NOT NULL DEFAULT '1.0' | |
| system_prompt | TEXT | | |
| user_prompt_template | TEXT | NOT NULL | |
| variables | JSONB | | |
| temperature | NUMERIC(3,2) | DEFAULT 0.7 | |
| max_tokens | INTEGER | DEFAULT 1024 | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.53 `ai_responses`

Full version tracking. Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| prompt_id | UUID | NOT NULL → ai_prompts.id | |
| model_id | UUID | NOT NULL → ai_models.id | |
| provider_version | VARCHAR(50) | NOT NULL | |
| model_version | VARCHAR(50) | NOT NULL | |
| prompt_version | VARCHAR(10) | NOT NULL | |
| response_version | VARCHAR(10) | NOT NULL DEFAULT '1.0' | |
| input_tokens | INTEGER | | |
| output_tokens | INTEGER | | |
| latency_ms | INTEGER | | |
| raw_request | JSONB | NOT NULL | |
| raw_response | JSONB | NOT NULL | |
| processed_result | JSONB | | |
| was_cached | BOOLEAN | NOT NULL DEFAULT FALSE | |
| is_fallback | BOOLEAN | NOT NULL DEFAULT FALSE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.54 `ai_insights`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL → users.id | |
| response_id | UUID | → ai_responses.id | |
| category | insight_category | NOT NULL | |
| title | VARCHAR(255) | NOT NULL | |
| summary | TEXT | NOT NULL | |
| details | JSONB | | |
| priority | INTEGER | NOT NULL DEFAULT 0 | |
| is_dismissed | BOOLEAN | NOT NULL DEFAULT FALSE | |
| is_read | BOOLEAN | NOT NULL DEFAULT FALSE | |
| expires_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.55 `fee_schedules`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL | |
| fee_type | fee_type | NOT NULL | |
| fee_trigger | fee_trigger | NOT NULL | |
| amount | NUMERIC(15,2) | | |
| percentage | NUMERIC(5,2) | | |
| min_amount | NUMERIC(15,2) | | |
| max_amount | NUMERIC(15,2) | | |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
### 8.56 `fee_transactions`

Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| fee_schedule_id | UUID | NOT NULL → fee_schedules.id | |
| transaction_id | UUID | → transactions.id | |
| ledger_entry_id | UUID | → ledger_entries.id | |
| amount | NUMERIC(15,2) | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL DEFAULT 'INR' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.57 `settlement_batches`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| batch_reference | VARCHAR(100) | NOT NULL UNIQUE | |
| total_amount | NUMERIC(15,2) | NOT NULL | |
| total_fee | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| total_net | NUMERIC(15,2) | NOT NULL | |
| transaction_count | INTEGER | NOT NULL | |
| status | settlement_batch_status | NOT NULL DEFAULT 'draft' | |
| processed_at | TIMESTAMPTZ | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.58 `reconciliation_records`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| transaction_id | UUID | NOT NULL → transactions.id | |
| provider | VARCHAR(50) | NOT NULL | |
| provider_reference | VARCHAR(255) | NOT NULL | |
| expected_amount | NUMERIC(15,2) | | |
| actual_amount | NUMERIC(15,2) | | |
| status | VARCHAR(20) | NOT NULL | |
| discrepancy | NUMERIC(15,2) | | |
| reconciled_at | TIMESTAMPTZ | | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.59 `daily_wallet_metrics`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| wallet_id | UUID | NOT NULL → wallets.id | |
| date | DATE | NOT NULL | |
| opening_balance | NUMERIC(15,2) | NOT NULL | |
| closing_balance | NUMERIC(15,2) | NOT NULL | |
| total_credits | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| total_debits | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| transaction_count | INTEGER | NOT NULL DEFAULT 0 | |
| unique_merchants | INTEGER | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.60 `daily_transaction_metrics`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| date | DATE | NOT NULL | |
| total_volume | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| total_count | INTEGER | NOT NULL DEFAULT 0 | |
| successful_count | INTEGER | NOT NULL DEFAULT 0 | |
| failed_count | INTEGER | NOT NULL DEFAULT 0 | |
| avg_transaction_value | NUMERIC(15,2) | | |
| peak_hour | INTEGER | | |
| payment_method_breakdown | JSONB | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.61 `merchant_metrics`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| merchant_id | UUID | NOT NULL → merchants.id | |
| date | DATE | NOT NULL | |
| total_volume | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| total_count | INTEGER | NOT NULL DEFAULT 0 | |
| avg_ticket_size | NUMERIC(15,2) | | |
| success_rate | NUMERIC(5,2) | | |
| settlement_amount | NUMERIC(15,2) | | |
| fee_amount | NUMERIC(15,2) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.62 `fraud_metrics`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| date | DATE | NOT NULL | |
| total_alerts | INTEGER | NOT NULL DEFAULT 0 | |
| confirmed_fraud | INTEGER | NOT NULL DEFAULT 0 | |
| false_positives | INTEGER | NOT NULL DEFAULT 0 | |
| amount_blocked | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| amount_saved | NUMERIC(15,2) | NOT NULL DEFAULT 0 | |
| top_rule_triggers | JSONB | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.63 `analytics_events`

Partitioned by month. Product analytics — not audit.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| session_id | UUID | → analytics_sessions.id | |
| user_id | UUID | → users.id | |
| event_name | VARCHAR(100) | NOT NULL | |
| properties | JSONB | DEFAULT '{}' | |
| device_type | VARCHAR(20) | | |
| os_version | VARCHAR(20) | | |
| app_version | VARCHAR(20) | | |
| ip_address | INET | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.64 `analytics_sessions`

Partitioned by month on `session_start`.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| tenant_id | UUID | → tenants.id | |
| user_id | UUID | → users.id | |
| session_start | TIMESTAMPTZ | NOT NULL | |
| session_end | TIMESTAMPTZ | | |
| duration_seconds | INTEGER | | |
| page_views | INTEGER | NOT NULL DEFAULT 0 | |
| device_type | VARCHAR(20) | | |
| os_version | VARCHAR(20) | | |
| app_version | VARCHAR(20) | | |
| ip_address | INET | | |
| country | VARCHAR(100) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.65 `job_definitions`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL UNIQUE | |
| description | TEXT | | |
| default_priority | job_priority | NOT NULL DEFAULT 'normal' | |
| max_retries | INTEGER | NOT NULL DEFAULT 3 | |
| timeout_seconds | INTEGER | NOT NULL DEFAULT 300 | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.66 `job_runs`

Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| job_definition_id | UUID | NOT NULL → job_definitions.id | |
| trigger | VARCHAR(50) | NOT NULL | scheduled/event/manual/retry |
| payload | JSONB | | |
| status | job_status | NOT NULL DEFAULT 'pending' | |
| priority | job_priority | NOT NULL DEFAULT 'normal' | |
| scheduled_at | TIMESTAMPTZ | | |
| started_at | TIMESTAMPTZ | | |
| completed_at | TIMESTAMPTZ | | |
| error_message | TEXT | | |
| retry_count | INTEGER | NOT NULL DEFAULT 0 | |
| result | JSONB | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.67 `feature_flags`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL UNIQUE | |
| key | VARCHAR(100) | NOT NULL UNIQUE | |
| description | TEXT | | |
| status | feature_flag_status | NOT NULL DEFAULT 'draft' | |
| owner | VARCHAR(100) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.68 `feature_rollouts`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| flag_id | UUID | NOT NULL → feature_flags.id | |
| strategy | rollout_strategy | NOT NULL | |
| percentage | INTEGER | | |
| user_ids | UUID[] | | |
| audience_id | UUID | → feature_audiences.id | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | |
| started_at | TIMESTAMPTZ | NOT NULL | |
| completed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.69 `feature_audiences`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| name | VARCHAR(100) | NOT NULL UNIQUE | |
| conditions | JSONB | NOT NULL | |
| description | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.70 `outbox_events`

Transactional outbox for event-driven architecture. Partitioned by month.

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| event_type | VARCHAR(100) | NOT NULL | versioned (e.g. payment.completed.v1) |
| aggregate_type | VARCHAR(100) | NOT NULL | |
| aggregate_id | VARCHAR(255) | NOT NULL | |
| payload | JSONB | NOT NULL | |
| status | outbox_event_status | NOT NULL DEFAULT 'pending' | |
| published_at | TIMESTAMPTZ | | |
| failed_at | TIMESTAMPTZ | | |
| failure_reason | TEXT | | |
| retry_count | INTEGER | NOT NULL DEFAULT 0 | |
| trace_id | UUID | | |
| version | VARCHAR(10) | NOT NULL DEFAULT '1.0' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.71 `config`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| key | VARCHAR(255) | PK | |
| value | JSONB | NOT NULL | |
| description | TEXT | | |
| updated_by | VARCHAR(255) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

### 8.72 `idempotency_keys`

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| key | VARCHAR(255) | NOT NULL UNIQUE | |
| status | idempotency_status | NOT NULL DEFAULT 'in_progress' | |
| response | JSONB | | |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

---

## 9. Foreign Key Relationships

180+ FK relationships connecting all 72 tables. Key patterns:

- `users.tenant_id → tenants.id` (multi-tenancy root)
- `sessions.user_id → users.id` (session ownership)
- `sessions.device_id → registered_devices.id` (device binding)
- `wallets.user_id → users.id` (wallet ownership)
- `wallet_balances.wallet_id → wallets.id` (balance scope)
- `account_links.wallet_id → wallets.id` and `account_links.account_id → accounts.id` (wallet→ledger bridge)
- `ledger_entries.account_id → accounts.id` (financial truth)
- `transactions.wallet_id → wallets.id` (business metadata)
- `payment_intents.payment_intent_id → payment_intents.id` (intent→transaction linkage)
- `cards.user_id → users.id`, `cards.wallet_id → wallets.id` (card scope)
- `physical_cards.card_id → cards.id`, `virtual_cards.card_id → cards.id` (card specialization)
- `upi_mandates.merchant_id → merchants.id` (mandate→merchant)
- `upi_collect_requests.payment_intent_id → payment_intents.id` (collect→intent)
- `audit_logs.tenant_id → tenants.id` (tenant-scoped audit)
- `analytics_events.session_id → analytics_sessions.id` (event→session)

All FKs use RESTRICT or NO ACTION for financial tables (no CASCADE deletes on ledger_entries, transactions).

---

## 10. Index Strategy

### Performance Indexes

| Table | Index | Columns | Type | Purpose |
|-------|-------|---------|------|---------|
| users | idx_users_tenant_phone | (tenant_id, phone) | UNIQUE | Login lookup |
| users | idx_users_tenant_email | (tenant_id, email) | UNIQUE | Email lookup |
| sessions | idx_sessions_active | (user_id) | PARTIAL WHERE status='active' | Active sessions |
| sessions | idx_sessions_expires | (expires_at) | BTREE | Cleanup |
| ledger_entries | idx_entries_account | (account_id, booked_at) | BTREE | Account history |
| ledger_entries | idx_entries_correlation | (correlation_id) | UNIQUE | Entry pairing |
| transactions | idx_tx_wallet | (wallet_id, created_at) | BTREE | Wallet history |
| transactions | idx_tx_reference | (transaction_reference) | UNIQUE | Idempotency |
| transaction_items | idx_tx_items_transaction | (transaction_id) | BTREE | Line items |
| payment_intents | idx_intents_wallet | (wallet_id, status) | BTREE | Wallet intents |
| cards | idx_cards_user | (user_id) | BTREE | User cards |
| outbox_events | idx_outbox_pending | (created_at) | PARTIAL WHERE status='pending' | Publisher poll |
| audit_logs | idx_audit_logs_created | (created_at) | BTREE | Time-range queries |
| notification_queue | idx_notif_queue_pending | (priority, scheduled_at) | PARTIAL WHERE status='queued' | Worker poll |
| job_runs | idx_job_runs_pending | (priority, scheduled_at) | PARTIAL WHERE status='pending' | Worker poll |
| idempotency_keys | idx_idempotency_keys_key | (key) | UNIQUE | Dedup |

Full index inventory: 85+ indexes across all 72 tables including partial, covering, and unique indexes.

---

## 11. RLS Strategy

### Tables REQUIRING RLS (26)

User-visible tables containing personal/financial data:

| Table | Policy |
|-------|--------|
| users | `tenant_id = current_setting('app.tenant_id') AND id = current_setting('app.user_id')` |
| sessions | `user_id = current_setting('app.user_id')` |
| registered_devices | `user_id = current_setting('app.user_id')` |
| wallets | `user_id = current_setting('app.user_id')` |
| wallet_balances | Via wallet ownership |
| transactions | Via wallet ownership |
| payment_intents | Via wallet ownership |
| cards | `user_id = current_setting('app.user_id')` |
| physical_cards | Via card ownership |
| virtual_cards | Via card ownership |
| network_tokens | Via card ownership |
| upi_handles | `user_id = current_setting('app.user_id')` |
| upi_accounts | `user_id = current_setting('app.user_id')` |
| upi_mandates | `user_id = current_setting('app.user_id')` |
| beneficiaries | `user_id = current_setting('app.user_id')` |
| documents | `user_id = current_setting('app.user_id')` |
| document_verifications | Via document ownership |
| notification_preferences | `user_id = current_setting('app.user_id')` |
| fraud_alerts | `user_id = current_setting('app.user_id')` |
| ai_insights | `user_id = current_setting('app.user_id')` |
| reward_balances | `user_id = current_setting('app.user_id')` |
| reward_transactions | `user_id = current_setting('app.user_id')` |
| transport_cards | Via wallet ownership |
| fare_capping | `user_id = current_setting('app.user_id')` |
| login_attempts | Admin-only write, no user read |
| payment_methods | `user_id = current_setting('app.user_id')` |

### Tables NOT Requiring RLS (46)

Internal/System tables: `tenants`, `refresh_tokens`, `accounts`, `ledger_entries`, `ledger_reversals`, `account_balances`, `account_links`, `merchants`, `merchant_locations`, `merchant_terminals`, `merchant_settlements`, `merchant_categories`, `transaction_items`, `card_artwork`, `upi_collect_requests`, `upi_devices`, `transport_usage`, `reward_programs`, `reward_rules`, `notification_templates`, `notification_queue`, `notification_delivery`, `audit_logs`, `security_events`, `fraud_rules`, `ai_models`, `ai_prompts`, `ai_responses`, `fee_schedules`, `fee_transactions`, `settlement_batches`, `reconciliation_records`, `daily_wallet_metrics`, `daily_transaction_metrics`, `merchant_metrics`, `fraud_metrics`, `analytics_events`, `analytics_sessions`, `job_definitions`, `job_runs`, `feature_flags`, `feature_rollouts`, `feature_audiences`, `outbox_events`, `config`, `idempotency_keys`.

These are accessed via service/API layer, not directly by end-users. RLS on these would complicate admin/internal access patterns without meaningful security benefit.

---

## 12. Partitioning Strategy

### Range Partitioning by Month

| Table | Partition Key | Retention | Active Partitions | Total Partitions |
|-------|--------------|-----------|-------------------|-----------------|
| login_attempts | created_at | 90 days | 3 | 3 |
| ledger_entries | booked_at | 7 years + cold | 1 + cold | 84 |
| payment_intents | created_at | 7 years | 1 + cold | 84 |
| transactions | created_at | 7 years | 1 + cold | 84 |
| transaction_items | created_at | 7 years | 1 + cold | 84 |
| upi_collect_requests | created_at | 1 year | 12 | 12 |
| transport_usage | created_at | 1 year | 12 | 12 |
| reward_transactions | created_at | 3 years | 36 | 36 |
| notification_queue | created_at | 30 days | 1 | 1 |
| notification_delivery | created_at | 90 days | 3 | 3 |
| audit_logs | created_at | 7 years | 1 + cold | 84 |
| security_events | created_at | 1 year | 12 | 12 |
| ai_responses | created_at | 90 days | 3 | 3 |
| fee_transactions | created_at | 7 years | 1 + cold | 84 |
| analytics_events | created_at | 90 days | 3 | 3 |
| analytics_sessions | session_start | 90 days | 3 | 3 |
| job_runs | created_at | 30 days | 1 | 1 |
| outbox_events | created_at | 7 days / 30 days | 1 | 1 |

Partitions are created 3 months in advance via pg_cron. Old partitions are detached for archival to cold storage (Parquet on S3).

---

## 13. SQL Views

### wallet_summary (SQL View — live)

```sql
CREATE VIEW wallet_summary AS
SELECT w.id, w.user_id, w.name, w.status,
  wb.available_balance, wb.reserved_balance, wb.ledger_balance,
  COUNT(DISTINCT t.id) AS lifetime_txns,
  COALESCE(SUM(t.amount) FILTER (WHERE t.status='completed'), 0) AS lifetime_volume,
  MAX(t.created_at) AS last_txn_at
FROM wallets w
LEFT JOIN wallet_balances wb ON wb.wallet_id = w.id
LEFT JOIN transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.user_id, w.name, w.status, wb.available_balance, wb.reserved_balance, wb.ledger_balance;
```

### user_dashboard (SQL View — live)

```sql
CREATE VIEW user_dashboard AS
SELECT u.id AS user_id, u.name, u.kyc_status,
  SUM(wb.available_balance) AS total_available,
  SUM(wb.reserved_balance) AS total_reserved,
  COUNT(DISTINCT w.id) AS wallet_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status='active') AS active_cards,
  COUNT(DISTINCT uh.id) FILTER (WHERE uh.status='active') AS upi_handles,
  COUNT(DISTINCT ai.id) FILTER (WHERE ai.is_read=false) AS unread_insights
FROM users u
LEFT JOIN wallets w ON w.user_id = u.id AND w.status='active'
LEFT JOIN wallet_balances wb ON wb.wallet_id = w.id
LEFT JOIN cards c ON c.user_id = u.id
LEFT JOIN upi_handles uh ON uh.user_id = u.id
LEFT JOIN ai_insights ai ON ai.user_id = u.id
GROUP BY u.id, u.name, u.kyc_status;
```

### monthly_spending (SQL View — live)

```sql
CREATE VIEW monthly_spending AS
SELECT t.user_id, DATE_TRUNC('month', t.created_at) AS month,
  COUNT(*) AS txn_count, SUM(t.amount) AS total_spent,
  AVG(t.amount) AS avg_txn, MAX(t.amount) AS max_txn,
  COUNT(DISTINCT ti.merchant_id) AS unique_merchants,
  SUM(t.amount) FILTER (WHERE t.transaction_type='refund') AS total_refunds
FROM transactions t
LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
WHERE t.status = 'completed'
GROUP BY t.user_id, DATE_TRUNC('month', t.created_at);
```

### reward_summary (Materialized View — refresh every 15 min)

### notification_overview (Materialized View — refresh every 5 min)

---

## 14. Materialized Views

| View | Refresh | Schedule | Purpose |
|------|---------|----------|---------|
| notification_overview | Complete | 5 min | Ops health dashboard |
| reward_summary | Complete | 15 min | Reward display cache |
| monthly_spending_mv | Complete | Daily | Heavy analytics cache |
| merchant_performance_mv | Complete | Hourly | Merchant dashboard |
| fraud_detection_summary_mv | Complete | 15 min | Fraud team dashboard |

All Materialized Views live in `reporting` schema to separate from transactional data.

---

## 15. Event Bus Architecture

### Transactional Outbox

Events are NOT published directly. Instead:

1. Business logic writes to business tables + `outbox_events` in same DB transaction
2. Publisher polls `outbox_events WHERE status = 'pending'`
3. Publishes to message broker (Redis Streams / RabbitMQ / Kafka)
4. On ack → marks `status = 'published'`
5. On max retries → marks `status = 'dead_letter'`

This guarantees at-least-once delivery and atomicity.

### Event Versioning

```
{doman}.{action}.v{major}
e.g. payment.completed.v1
```

- Major version bump = schema-breaking
- Minor changes are optional fields (same version)
- Schema registry stores JSON Schema per versioned type
- Dead letter queue for schema validation failures

### Event Types (23 events)

| Event | Payload Description |
|-------|-------------------|
| payment.completed.v1 | txn_id, intent_id, amount, currency, wallet_id, merchant_id |
| payment.failed.v1 | txn_id, intent_id, amount, failure_reason |
| wallet.updated.v1 | wallet_id, user_id, new_balance, change_amount, change_type |
| wallet.created.v1 | wallet_id, user_id, wallet_type |
| reward.earned.v1 | user_id, program_id, amount, txn_id |
| reward.redeemed.v1 | user_id, program_id, amount |
| notification.sent.v1 | user_id, channel, template_id, status |
| ticket.created.v1 | txn_id, user_id, transport_mode, route, fare |
| ticket.used.v1 | txn_id, user_id, transport_mode, fare |
| ai.insight.generated.v1 | insight_id, user_id, category, priority |
| user.registered.v1 | user_id, phone |
| user.kyc_updated.v1 | user_id, kyc_status |
| card.issued.v1 | card_id, user_id, card_type, card_network |
| card.frozen.v1 | card_id, user_id |
| card.unfrozen.v1 | card_id, user_id |
| card.lost.v1 | card_id, user_id |
| upi.mandate.created.v1 | mandate_id, user_id, merchant_id, umn |
| upi.collect.received.v1 | collect_id, payer_handle, amount |
| merchant.settlement.completed.v1 | settlement_id, merchant_id, amount |
| fraud.alert.raised.v1 | alert_id, user_id, severity, txn_id |
| security.event.detected.v1 | event_id, user_id, event_type, severity |
| transport.tap.v1 | usage_id, user_id, mode, fare |
| transport.fare_capped.v1 | cap_id, user_id, mode, period |

---

## 16. Ledger Architecture

### Double-Entry Design

Every money movement creates exactly two `ledger_entries` sharing a `correlation_id`:

```
Debit:  account_id = sender,    amount = X, side = 'debit'
Credit: account_id = receiver,  amount = X, side = 'credit'
```

### Account Types

| Type | Purpose |
|------|---------|
| user_available | User spendable balance |
| user_reserved | User pending holds |
| merchant | Merchant settlement |
| platform | Platform operations |
| reward | Reward funding pool |
| fee | Fee collection |
| escrow | Temporary holds |
| settlement | Bank clearing |
| bank_clearing | Inter-bank clearing |
| suspense | Unmatched transactions |

### Immutability Enforcement

- DB trigger: `BEFORE UPDATE ON ledger_entries` → RAISE EXCEPTION
- DB trigger: `BEFORE DELETE ON ledger_entries` → RAISE EXCEPTION
- Corrections via reversing entries (new pair with `reversal_entry_id` pointing to original)
- `reversed_by_entry_id` set on original entry when reversed
- Reversals require admin approval (logged in `ledger_reversals`)

### Wallet → Ledger Mapping

Each wallet maps to ≥2 accounts:
- `USER_AVAILABLE` — spendable
- `USER_RESERVED` — pending holds

This separation lets the UI show "available" vs "held" without exposing ledger internals.

### Balance Computation

`account_balances` updated atomically in same transaction as entry insert using optimistic locking (`version` column).

---

## 17. Merchant Architecture

### Onboarding Flow
`Signup → merchants(status:pending) → Documents → verification_status:pending → KYC → verified → Fee schedule → status:active → Settlement account → Locations & Terminals`

### Settlement Flow (T+1)
`Collect completed txns → Calculate fees → settlement_batch → Ledger entries → merchant_settlement(completed) → emit merchant.settlement.completed.v1`

### Categories
`merchant_categories` with MCC codes. `is_high_risk` flag for fraud scoring.

---

## 18. UPI Architecture

### Flows
- **Account Linking:** Phone → upi_handles → Bank verification → upi_accounts → Link wallet
- **Collect Request:** Merchant initiates → upi_collect_requests(pending) → payment_intent → User approves → captured → Ledger entries
- **Mandate:** Setup → upi_mandates(active) → UMN → NPCI → On due: payment_intent → captured

### Device Binding
- **Soft:** Device registered, movable
- **Hard:** Cryptographic binding, requires re-registration

---

## 19. Card Architecture

### Hierarchy
```
cards (base)
  ├── physical_cards (PAN, CVV, shipping)
  └── virtual_cards (PAN, CVV, merchant lock)
cards ← network_tokens (DPANs)
cards ← card_artwork (themes)
```

### Lifecycle
`Issued → Active → Frozen → Cancelled/Expired`

### PCI DSS
- PAN encrypted (AES-256), stored in `encrypted_pan`
- Only `last_four` in plaintext
- `pan_hash` (SHA-256) for dedup & lookup
- CVV encrypted separately or not stored
- Network tokens (DPANs) preferred for recurring

---

## 20. Authentication Architecture

### Token Model
- **Access Token:** JWT, 15-min TTL, HMAC-SHA256
- **Refresh Token:** Opaque, 7-day TTL, rotation on use
- Both stored in `expo-secure-store` (mobile)

### Session Binding
- Sessions bound to `(user_id, device_id)`
- Every request validates: session active, not expired, not revoked
- `last_active_at` updated on each request (rate-limited to 1/min)

### Endpoints
```
POST /auth/otp/send     → phone, creates OTP in memory (5min TTL)
POST /auth/otp/verify   → phone + otp, creates user+session+device, returns tokens
POST /auth/refresh      → refresh token, rotates
POST /auth/logout       → revoke session
GET  /auth/me           → validate session, return user
POST /auth/devices      → register device
GET  /auth/devices      → list devices
DELETE /auth/devices/:id → soft-delete device, revoke sessions
GET  /auth/sessions     → list sessions
POST /auth/sessions/revoke → revoke specific session
```

### Auth Tables
- `users` — identity + KYC
- `sessions` — server-side sessions
- `registered_devices` — device enrollment
- `refresh_tokens` — rotation tracking
- `login_attempts` — rate limiting + brute force detection (partitioned monthly)

---

## 21. Session Lifecycle

```
Login → POST /auth/otp/verify
  → Create session (status: active, expires_at: +7d)
  → Create device record (if new)
  → Issue JWT (15min) + refresh token (7d)
  → Store refresh_token_hash on session

Each request → requireAuth middleware:
  → Decode JWT → Lookup session → Verify active, not expired, not revoked
  → Update last_active_at (every 60s)
  → Attach AuthUser to request

Refresh → POST /auth/refresh:
  → Hash incoming token → Find matching refresh_tokens record
  → Verify not used, not expired → Mark used
  → Issue new JWT + new refresh token
  → Update refresh_token_hash on session

Logout → POST /auth/logout:
  → Set session.revoked_at = NOW()
  → Mark session.refresh_token as used

Expiry → Background job:
  → Mark sessions WHERE expires_at < NOW() as expired
  → Clean up used refresh tokens > 90 days old
  → Clean up revoked devices > 1 year old

Device Removal → DELETE /auth/devices/:id:
  → Soft-delete device (revoked_at)
  → Revoke all sessions WHERE device_id = :id
```

---

## 22. Payment Lifecycle

```
1. CREATED:    payment_intent created (status: created)
2. AUTHORIZED: User authorizes (OTP/biometric), amount held (user_reserved account)
3. CAPTURED:   Payment confirmed → transaction created
               → ledger_entries: debit user_available, credit merchant account
               → wallet_balances updated
               → transaction status: completed
               → outbox_event: payment.completed.v1
4. FAILED:     If authorization fails or capture fails
               → payment_intent: failed
               → transaction: failed
               → outbox_event: payment.failed.v1
5. CANCELLED:  User cancels before authorization
6. EXPIRED:    Intent not acted on within expiry window

REFUND:
  → New payment_intent (type: refund)
  → reversing ledger entries
  → transaction: refunded
  → outbox_event: payment.completed.v1

DISPUTE:
  → transaction: disputed
  → Hold funds in escrow account
  → If resolved in favor of merchant: release to merchant
  → If resolved in favor of user: refund to user
```

---

## 23. Fraud Architecture

### Detection Layers
1. **Rule-based:** `fraud_rules` with JSON conditions (velocity, amount, geo, device, behavioral)
2. **ML-based:** AI model scores attached to transactions (future)
3. **Real-time:** `security_events` stream processing for anomaly detection

### Alert Flow
```
Transaction → Evaluate fraud_rules
  → Rule matches → Create fraud_alert (status: open, severity: low/med/high/critical)
  → If critical → Block transaction immediately
  → If high → Flag for manual review + notify security team
  → If medium/low → Async review queue
  → outbox_event: fraud.alert.raised.v1
```

### Tables
- `fraud_rules` — configurable rules
- `fraud_alerts` — generated alerts
- `security_events` — raw security events
- `fraud_metrics` — daily fraud KPIs

---

## 24. Analytics Architecture

### Separation from Audit

| Dimension | Audit Logs | Analytics Events |
|-----------|-----------|-----------------|
| Purpose | Compliance, security | Product insights |
| Retention | 7 years | 90 days |
| Schema | Fixed (audit_action enum) | Flexible (event name + JSON properties) |
| Access | Admin/Security | Product/Data team |
| RLS | No (admin only) | No (data pipeline) |

### Tables
- `analytics_events` — individual events (screen_view, button_click, feature_use) — partitioned monthly
- `analytics_sessions` — user sessions with duration, page views, device info — partitioned monthly

### Ingestion
- Events batched on mobile, sent every 30s or on app background
- Server-side events written directly
- Analytics pipeline: DB → Kafka → ClickHouse/Data Warehouse (future)

---

## 25. Reporting Architecture

### Aggregation Tables

| Table | Source | Update Method | Retention |
|-------|--------|--------------|-----------|
| daily_wallet_metrics | wallets + transactions | Async batch (pg_cron, daily) | 1 year |
| daily_transaction_metrics | transactions | Async batch (pg_cron, daily) | 3 years |
| merchant_metrics | transactions + settlements | Async batch (pg_cron, daily) | 3 years |
| fraud_metrics | fraud_alerts | Async batch (pg_cron, daily) | 1 year |

### Generation Strategy
- pg_cron job runs at 00:15 UTC daily
- Processes previous day's data
- Uses INSERT ... ON CONFLICT for idempotency
- Materialized Views for higher-frequency needs (notifications, fraud dashboard)

---

## 26. AI Architecture

### Versioning

Every AI response captures the full version context:

```
ai_responses:
  provider_version: "2024-10-01"     # API version
  model_version:    "claude-sonnet-4" # Model ID + version
  prompt_version:   "1.3"            # Prompt template version
  response_version: "2.1"            # Output schema version
```

This enables:
- A/B testing prompts
- Regression detection when models update
- Reproducibility of insights
- Graceful degradation via `is_fallback` flag

### Insight Generation Flow
```
Transaction completed
  → Check if insight should be generated (AI rules)
  → Select prompt + model
  → Call AI provider
  → Store ai_responses (with version info)
  → Process result
  → Create ai_insight
  → Emit ai.insight.generated.v1
  → Notification queued
```

### Tables
- `ai_models` — registered model versions
- `ai_prompts` — versioned prompt templates
- `ai_responses` — inference logs (partitioned monthly)
- `ai_insights` — processed insights delivered to users

---

## 27. Backup & Disaster Recovery

### Backup Strategy

| Data | Method | Frequency | Retention | RPO | RTO |
|------|--------|-----------|-----------|-----|-----|
| Full DB | pg_dump | Daily | 30 days | 24h | 4h |
| WAL | Continuous archiving | Continuous | 7 days | 5min | 1h |
| Partition data | pg_dump per partition | Monthly | 7 years | — | — |
| Cold storage | Parquet on S3 | Monthly | 7 years | — | 24h |

### Point-in-Time Recovery (PITR)
- WAL archiving to S3 (using pg_receivewal or WAL-G)
- PITR capability: up to 7 days back
- Recovery to any 5-minute window

### Disaster Recovery Tiers
| Tier | Scenario | Action | RTO |
|------|----------|--------|-----|
| 1 | Single AZ failure | Automatic failover to replica | 60s |
| 2 | Region failure | Promote cross-region replica | 15min |
| 3 | Data corruption | PITR from WAL archive | 1h |
| 4 | Catastrophic | Restore from full backup + WAL | 4h |

### Replication
- Streaming replication to 1+ read replicas for query offload
- Synchronous commit for ledger_entries (financial data)
- Asynchronous commit for analytics, reporting, notifications

---

## 28. Security Model

### Encryption Layers

| Layer | Method | Scope |
|-------|--------|-------|
| Transport | TLS 1.3 | All API communication |
| Database | AES-256 TDE | PostgreSQL data at rest |
| Column | AES-256 | PAN, CVV in physical_cards/virtual_cards |
| Token | SHA-256 | Refresh tokens, idempotency keys |
| Password/PIN | bcrypt | Transaction PIN hash |

### Access Control

| Principle | Implementation |
|-----------|---------------|
| Least privilege | Service-specific DB roles |
| Row-level | RLS on 26 user-facing tables |
| Column-level | Restricted access to encrypted columns |
| Network-level | VPC, security groups, IP whitelisting |
| Application-level | JWT + session validation on every request |

### Audit Trail
- All compliance-relevant actions logged to `audit_logs`
- Immutable (no UPDATE/DELETE — enforced by trigger)
- Retained for 7 years
- Includes: who, what, when, IP, user agent, old/new values

---

## 29. Compliance Considerations

### PCI DSS (Card Data)

| Requirement | Implementation |
|------------|---------------|
| Encrypt PAN at rest | AES-256 on `encrypted_pan` |
| Mask PAN | Only `last_four` and `pan_last_four` in plaintext |
| Hash PAN | SHA-256 in `pan_hash` for dedup |
| Don't store CVV after auth | `encrypted_cvv` with short TTL or crypto erase |
| Network tokens preferred | `network_tokens` table for DPANs |
| Access control | RLS + column-level permissions |
| Audit logging | All card operations in `audit_logs` |
| Key management | External KMS (AWS KMS / HashiCorp Vault) |

PCI DSS Scope: `cards`, `physical_cards`, `virtual_cards`, `network_tokens`, `transactions` (in-scope). All other tables out of scope.

### GDPR (Personal Data)

| Requirement | Implementation |
|------------|---------------|
| Right to erasure | Soft-delete pattern (is_active=false) + anonymization job |
| Data minimization | Only necessary PII collected |
| Consent tracking | `notification_preferences` for marketing opt-in |
| Data portability | SQL views for user data export |
| Breach notification | `security_events` + alerting pipeline |
| DPA required | Tenant contracts |

GDPR Scope: `users`, `documents`, `registered_devices`, `sessions` (in-scope).

### SOC 2

| Trust Principle | Implementation |
|----------------|---------------|
| Security | RLS, encryption, audit logs |
| Availability | HA replication, backup strategy, RTO/RPO defined |
| Processing integrity | Double-entry ledger, reconciliation |
| Confidentiality | Column encryption, access control |
| Privacy | GDPR compliance for personal data |

---

## 30. Final Total Table Count

| Domain | Table Count |
|--------|-------------|
| Tenants | 1 |
| Auth | 5 |
| Wallets | 3 |
| Ledger | 4 |
| Merchants | 5 |
| Payments | 4 |
| Cards | 5 |
| UPI | 5 |
| Beneficiaries | 1 |
| Documents | 2 |
| Transport | 3 |
| Rewards | 4 |
| Notifications | 4 |
| Security | 4 |
| AI | 4 |
| Finance | 4 |
| Reporting | 4 |
| Analytics | 2 |
| System | 8 |

**Total tables: 72**

**Total PostgreSQL enum types: 48**

**Total migrations: 25**

**Total indexes: 85+**

**Tables with RLS: 26**

**Partitioned tables: 18**

**SQL Views: 3 (live) + 5 Materialized Views**

**Event types: 23**

This architecture is designed for 10M users in year 1 with scalability to 100M+. It separates concerns cleanly (wallets vs accounts, metadata vs ledger, analytics vs audit), ensures financial integrity (immutable double-entry ledger, reversing entries, reconciliation), and builds in compliance from day one (PCI DSS, GDPR, SOC 2).
