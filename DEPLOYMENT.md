# Vault — Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Root (pnpm monorepo)                                       │
│  ├── artifacts/api-server/  → Railway (Express + esbuild)   │
│  ├── artifacts/mockup-sandbox/  → Vercel (Vite + React)     │
│  └── artifacts/mobile/    → EAS / APK (Expo + React Native) │
│  ├── lib/db/              → Drizzle ORM (shared)            │
│  ├── lib/api-client-react/  → Generated React-Query client  │
│  └── lib/api-zod/         → Generated Zod schemas           │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. API Server — Railway

### Deploy Steps

1. Push the repo to GitHub and connect to Railway.
2. Railway auto-detects `railway.json` at `artifacts/api-server/railway.json`.
3. Set **Root Directory** to `artifacts/api-server` in Railway dashboard.
4. The build uses Nixpacks which runs `pnpm install` then `pnpm run build`.
5. The start command is `node --enable-source-maps ./dist/index.mjs`.

### Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Railway injects this automatically |
| `JWT_SECRET` | **Yes** | Generate: `openssl rand -hex 32` |
| `CORS_ORIGINS` | No | Comma-separated origins (defaults to `http://localhost:5173,http://localhost:3001`) |
| `NODE_ENV` | No | Set to `production` |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, `error` |
| `DATABASE_URL` | No* | PostgreSQL connection string for Drizzle |
| `OPENAI_API_KEY` | No | For AI insights (choose one provider) |
| `ANTHROPIC_API_KEY` | No | For AI insights (choose one provider) |
| `GEMINI_API_KEY` | No | For AI insights (choose one provider) |

> *Required if using database-backed features. Currently auth uses in-memory stores.

### Health Check

Railway's health check endpoint: `GET /` → `{ "status": "ok", "service": "vault-api" }`

---

## 2. Web App (Mockup Sandbox) — Vercel

### Deploy Steps

1. Connect repo to Vercel.
2. Set **Root Directory** to `artifacts/mockup-sandbox`.
3. Vercel auto-detects `vercel.json` with SPA rewrites.
4. Framework preset: **Vite**.
5. Build command: `vite build` (run from within artifact directory with pnpm installed).

### Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| (none) | — | All sensitive config is handled at the API server level |

### SPA Routing

`vercel.json` rewrites all routes to `/index.html` for client-side routing.

---

## 3. Mobile App (Expo) — EAS / APK

### Production Build

```bash
cd artifacts/mobile
EXPO_PUBLIC_API_URL=https://your-api.railway.app eas build --platform all
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | **Yes** | Full URL to the production API server (e.g. `https://vault-api.up.railway.app`) |

### Build & Publish

- **Android APK/AAB**: `eas build --platform android --profile production`
- **iOS IPA**: `eas build --platform ios --profile production`
- **OTA Update**: `eas update --branch production`

### Pre-build Configuration

Before building for production, update `artifacts/mobile/app.json`:

```json
"expo-router": {
  "origin": "https://your-production-domain.com"
}
```

Replace `your-production-domain.com` with your actual production URL for deep linking.

---

## 4. Environment Variable Reference (All Targets)

| Variable | Target | Description |
|---|---|---|
| `PORT` | API Server | Server port (Railway auto-injects) |
| `JWT_SECRET` | API Server | **Required in production** — `openssl rand -hex 32` |
| `CORS_ORIGINS` | API Server | Allowed origins for CORS (comma-separated) |
| `NODE_ENV` | API Server | Controls logging format and dev-only features |
| `LOG_LEVEL` | API Server | Pino log level |
| `DATABASE_URL` | API Server | PostgreSQL connection string |
| `OPENAI_API_KEY` | AI Service | OpenAI provider |
| `ANTHROPIC_API_KEY` | AI Service | Anthropic provider |
| `GEMINI_API_KEY` | AI Service | Google Gemini provider |
| `EXPO_PUBLIC_API_URL` | Mobile | Production API URL (embedded at build time) |
| `EXPO_PUBLIC_ROUTER_ORIGIN` | Mobile | Deep link origin (set in app.json) |

---

## 5. Build Verification

### Prerequisites

```bash
node --version  # ^22
pnpm --version  # ^9
```

### Full Workspace

```bash
pnpm install
pnpm run typecheck   # TS type-check all packages
pnpm run build       # Build all artifacts
```

### Individual Artifacts

```bash
# API Server
cd artifacts/api-server && pnpm run build

# Web App
cd artifacts/mockup-sandbox && pnpm run build

# Mobile (requires Expo CLI)
cd artifacts/mobile && npx expo export --platform web
```

---

## 6. Known Issues

1. **shadcn/ui React 19 type conflicts**: `calendar.tsx` and `spinner.tsx` have `Ref` type mismatches from duplicate `@types/react` installations. Builds succeed (esbuild/Vite ignore these), but typecheck shows errors. Fix: align `@types/react` versions across the workspace, or add `// @ts-nocheck` to these files.

2. **Mobile app not in root build pipeline**: The Expo mobile app is excluded from the root `pnpm run build` because it requires Expo CLI and native toolchains. Build it separately with `eas build` or `npx expo export`.

3. **In-memory auth store**: Currently auth uses in-memory Maps. Restarting the API server clears all sessions and OTPs. For production, integrate with PostgreSQL/Drizzle.

---

## 7. Changed Files (This PR)

| File | Why Changed |
|---|---|
| `artifacts/api-server/src/app.ts` | Hardened CORS (env-driven origins), added root health endpoint |
| `artifacts/api-server/src/lib/auth.ts` | JWT_SECRET now required in production with clear error message |
| `artifacts/api-server/src/index.ts` | Added default PORT fallback (3001) + graceful validation |
| `artifacts/api-server/src/routes/auth.ts` | Removed OTP leak in production (dev-only log) |
| `artifacts/api-server/railway.json` | **New** — Railway deployment config |
| `artifacts/mockup-sandbox/vite.config.ts` | Removed PORT/BASE_PATH hard-requirement for Vercel; guard Replit plugins behind REPL_ID check |
| `artifacts/mockup-sandbox/vercel.json` | **New** — Vercel SPA config with rewrites |
| `artifacts/mobile/app.json` | Changed expo-router origin from hardcoded replit.com to placeholder |
| `artifacts/mobile/vercel.json` | **New** — Vercel config (for web export of mobile) |
| `.env.example` | **New** — Documented all required/production env vars |
| `.nvmrc` | **New** — Node 22 for consistent runtimes |
| `DEPLOYMENT.md` | **New** — This file |

### Not Changed (Pre-existing / Out of Scope)

- `/artifacts/mobile/context/AuthContext.tsx` — Already supports `EXPO_PUBLIC_API_URL` env var; localhost fallback is correct for dev
- `/lib/api-client-react/src/custom-fetch.ts` — Already supports `setBaseUrl()` and `setAuthTokenGetter()` for runtime URL configuration
- `pnpm-workspace.yaml` — Replit-specific overrides don't affect production on other platforms
