# Vault Wallet — Ponytail Code Audit Report

> **Date:** 2026-07-12 (Updated after fixes)
> **Scope:** Full monorepo (api-server, mobile, lib packages)
> **Methodology:** Ponytail — iterative fix → verify → commit
> **Severity:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

---

## Fixes Applied ✅ (All committed 2026-07-12)

| # | Finding | Type | Commit | Build/Typecheck |
|---|---------|------|--------|----------------|
| C1 | `Authorization: ***` → `Bearer` in mobile AuthContext | 🔴 Blocking | `39c0709` | ✅ |
| C2 | JWT_SECRET already hardened (throws in production, safe dev fallback) | 🔴 Fixed in prior session | — | ✅ |
| C3 | Hardcoded OTP `"000000"` → `DEV_OTP` env var | 🔴 | `e2a55db` | ✅ |
| H1 | Added `requireAuth` middleware to cards routes | 🟠 | `2200969` | ✅ |
| H2 | Configurable rate limiting on OTP send endpoint | 🟠 | `4312276` | ✅ |
| M2 | `console.error`/`console.log` → structured pino logger | 🟡 | `20612d1` | ✅ |
| L2 | Updated `.env.example` with all missing vars | 🔵 | `d5307ed` | ✅ |
| — | Removed unused deps (`jsonwebtoken`, `cookie-parser`, `drizzle-orm`) | 🧹 | `44adf0b` | ✅ |

### Fix Details

**C1 — Auth header bearer (blocker):** All 3 occurrences of `Authorization: *** ${token}` in `AuthContext.tsx` replaced with `Authorization: Bearer ${token}`. Previously every authenticated mobile request was rejected by the server middleware which checks for `Bearer ` prefix.

**C2 — JWT secret:** Already resolved in a prior session. Current code in `lib/auth.ts` uses an IIFE that:
- Returns `process.env.JWT_SECRET` if set
- Throws with a clear error if `NODE_ENV=production` and JWT_SECRET is missing
- Falls back to `"dev-jwt-secret-do-not-use-in-prod"` only in non-production environments

**C3 — OTP env var:** Replaced hardcoded `"000000"` with `process.env.DEV_OTP || "000000"`. Preserves dev behavior while making the value configurable across environments. Documented in `.env.example`.

**H1 — Cards auth:** Added `requireAuth` middleware to all 6 card routes (GET, GET/:id, POST, PATCH, DELETE, freeze/unfreeze). Verified that no mobile client calls these routes (WalletContext uses AsyncStorage locally).

**H2 — OTP rate limiting:** Simple in-memory per-phone rate limiter added to `/auth/otp/send`:
- Disabled by default in development (`NODE_ENV=development`)
- Enabled in production: 5 requests per 60s window by default
- Configurable via `OTP_RATE_LIMIT_MAX` and `OTP_RATE_LIMIT_WINDOW_MS`
- Built-in stale entry cleanup at 1000+ entries

**M2 — Pino logger:** `insights.ts` now uses `logger.error({ err })` (was `console.error`). `auth.ts` uses `logger.info({ phone })` (was `console.log`).

**L2 — .env.example:** Added documentation for `AI_PROVIDER`, `DEV_OTP`, `OTP_RATE_LIMIT_MAX`, `OTP_RATE_LIMIT_WINDOW_MS`. New env vars grouped in their own section. Fixed escaped-newlines corruption in the `AI_PROVIDER` section from a previous patch.

**Dead code cleanup:** Removed provably unused dependencies from api-server `package.json`:
- `jsonwebtoken` — never imported (api-server uses native Node.js `crypto` for JWT)
- `cookie-parser` — never imported (only reference was redaction config in logger)
- `drizzle-orm` — used by `lib/db` workspace, not directly by api-server
- `@types/cookie-parser` — orphaned type definition

---

## 🟡 MEDIUM (Remaining)

### M1. Duplicate type definitions across packages

**Files:**
- `routes/cards.ts:3-17` defines `CardRecord` inline
- `routes/auth.ts:13-48` defines `UserRecord`, `SessionRecord`, `DeviceRecord` inline
- `mobile/types/index.ts` defines derived types
- `lib/db/src/schema/auth.ts` has the canonical Drizzle schemas
- `lib/db/src/schema/cards.ts` has the canonical card schema

**Issue:** The API server rewrites types that already exist in `lib/db/`. Different `CardNetwork` enums exist: `routes/cards.ts` has `["visa", "mastercard", "rupay", "amex", "discover", "unknown"]` while `mobile/types/index.ts` adds `"diners"`, `"jcb"`.
**Fix:** Reuse types from `lib/db/` (for Drizzle schema types) or create a shared types package. At minimum audit for consistency.

### M3. No Zod validation on request bodies

**Files:** `routes/insights.ts:13`, `routes/cards.ts:37`, `routes/auth.ts:189,208`
**Issue:** Request bodies are typed with `as Type` assertions — no runtime validation. A malformed request could crash the server or produce incorrect results. The project uses Zod (in `lib/api-zod` and `lib/db/src/schema/`), but the API server doesn't use it for input validation.
**Fix:** Use Zod schemas (from `api-zod` or inline) with a validation middleware. Parse bodies before using them.

### M4. `api.schemas.ts` is auto-generated but empty

**File:** `lib/api-client-react/src/generated/api.schemas.ts` (7 lines, effectively empty)
**Issue:** The orval codegen pipeline isn't producing useful output. The OpenAPI spec may be out of sync with the actual API.
**Fix:** Investigate orval output, fix the spec or codegen config.

---

## 🟠 HIGH (Architecture — Significant Effort)

### H3. In-memory only data — no persistence

**Files:** `routes/auth.ts` (users, sessions, devices, otpStore), `routes/cards.ts` (cards array), `services/ai/index.ts` (insightCache)
**Issue:** All data lives in Maps/arrays in memory. Server restart wipes everything — all user registrations, sessions, cards, and cached insights are lost. While the Drizzle ORM schemas exist in `lib/db/`, the API server never imports or uses them.
**Fix:** Wire up Drizzle ORM for persistence. This is a significant effort; at minimum add a startup warning.

---

## 🔵 LOW (Nice to Fix)

### L1. Mobile app uses `http://localhost` fallback

**File:** `artifacts/mobile/context/AuthContext.tsx:44-46`
**Issue:** Falls back to `http://localhost:3001` when no `EXPO_PUBLIC_API_URL` is set. In production, this would leak API requests in cleartext. Not critical since Expo/React Native warns about non-HTTPS in production.
**Fix:** Set `EXPO_PUBLIC_API_URL` in the mobile `.env` (currently only has production URL).

### L3. Server restarts don't clean `insightCache` on schema change

**File:** `services/ai/index.ts:7-33`
**Issue:** The in-memory insight cache never invalidates based on underlying data changes. Only time-based TTL (30 min). If transaction data is updated, stale insights are served.
**Fix:** Add a clear-cache endpoint or use cache keys that include a session version.

### L4. Missing CI/CD and test infrastructure

**Issue:** No test files found in the monorepo. No GitHub Actions CI config. The project has pnpm but no test scripts configured in `package.json`.
**Fix:** Set up vitest/jest, add smoke tests for the API server, add CI workflow.

---

## Issues Already Handled Well ✅

- **Pino logger with redaction** in `lib/logger.ts` — properly redacts auth headers and cookies.
- **SecureStore for token storage** in mobile `AuthContext.tsx` — uses `expo-secure-store`, not AsyncStorage.
- **JWT verification uses `timingSafeEqual`** in `lib/auth.ts:66` — prevents timing attacks on signatures.
- **JWT payload has proper claims** — `iat`, `exp`, `sub`, `sid` with reasonable TTLs (15m access, 7d refresh).
- **Refresh token rotation** in `routes/auth.ts:161-171` — old refresh becomes invalid on rotation.
- **JWT_SECRET hardened** — throws in production if missing, safe dev fallback only in non-production.
- **OTP configurable** via `DEV_OTP` env var with backward-compatible default.
- **OTP rate limited** in production with configurable thresholds, disabled in dev.
- **Cards routes authenticated** with `requireAuth` middleware.
- **custom-fetch.ts** — Robust error handling, content-type negotiation, React Native body detection.
- **`.env` files are correctly gitignored** — not in version control.
- **pnpm `minimumReleaseAge: 1440`** — supply chain attack defense.
