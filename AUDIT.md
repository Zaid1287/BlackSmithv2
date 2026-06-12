# BlackSmith Traders — Security & Optimization Audit

**Date:** 2026-06-12
**Scope:** `server/` (Express API), `shared/schema.ts` (Drizzle), `client/src/` (React), deployment config.
**Stack:** React + TS / Node + Express / Postgres (Neon) + Drizzle. 256MB RAM, Render, ~10 concurrent users.

This document records what was found, what was fixed in this pass, and what remains as
prioritized follow-up. Fixes applied in this pass are marked **[FIXED]**; the rest are
**[TODO]** with concrete guidance.

---

## Phase 1 — Critical Security & Reliability

### Security

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| S1 | **Critical** | Hardcoded JWT fallback secret `"blacksmith-traders-secret"`. Anyone who reads the source can forge a valid admin token. | **[FIXED]** |
| S2 | **Critical** | `GET /api/users` required only auth, not admin — any driver could list **all users including bcrypt password hashes and salaries**. | **[FIXED]** |
| S3 | **Critical** | `/api/auth/me` and the users list returned the `password` hash field to the client. | **[FIXED]** |
| S4 | **High** | IDOR: `PATCH /api/journeys/:id/complete`, `/location`, `GET /api/journeys/:id/expenses`, `POST /api/expenses` accepted any journey id with no ownership check. A driver could mutate/read **any** journey. | **[FIXED]** |
| S5 | **High** | Salary endpoints (`GET /api/salaries`, `POST /api/salaries/pay`, `/reset`) were auth-only. Client hid them from drivers, but a driver token could call them directly to pay/reset salaries. | **[FIXED]** |
| S6 | **High** | `POST /api/init` was public and seeded `admin/admin123` + `driver/driver123`. Anyone could trigger it; default creds are well-known. | **[FIXED]** — gated behind `INIT_SECRET`, password from `INIT_ADMIN_PASSWORD`, sample-driver seeding removed. |
| S7 | **High** | Two **unauthenticated** debug endpoints (`/api/debug/journey-114`, `/api/debug/recalculate-114`) exposed financials and let anyone trigger recalculation. They also called undefined storage methods (runtime throw). A third (`/api/debug/expenses/:id`) leaked expense data. | **[FIXED]** — all three removed. |
| S8 | **Medium** | Error responses leaked `error.message` / `error.stack` to clients across many handlers. | **[FIXED]** in the hot paths + global handler; a few admin handlers still echo messages (low risk). |
| S9 | **Medium** | No security headers (no `helmet`), `X-Powered-By` advertised Express. | **[FIXED]** — baseline headers + `x-powered-by` disabled. Install `helmet` for the full set (**[TODO]**). |
| S10 | **Medium** | `.gitignore` did not list `.env` — risk of committing secrets. | **[FIXED]** + added `.env.example`. |
| S11 | **Medium** | No SQL injection found — Drizzle parameterizes all queries and no `sql` template uses user input. (Noted as verified-safe.) | OK |
| S12 | **Low** | JWT stored in `localStorage` (XSS-stealable), 24h expiry, no revocation. | **[TODO]** — see Phase 4. |
| S13 | **Low** | `getActiveJourneys` returns every active journey (incl. pouch/balance/destination) to any driver, not just their own. | **[TODO]** — confirm if the dispatch board is intentionally shared; if not, filter by driver for non-admins. |

**SQL injection:** none. Drizzle's query builder parameterizes everything; the raw `sql\`...\``
fragments only interpolate column references, never request input.

**Password hashing:** bcrypt, cost 10 — adequate. No change needed.

### Reliability

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| R1 | **Critical** | Global error handler did `throw err` **after** sending the response. That surfaced as an `uncaughtException`, and the `uncaughtException` handler calls `gracefulShutdown` → **any handled error could take the whole server down** (DoS). | **[FIXED]** — re-throw removed, `headersSent` guard added. |
| R2 | **High** | `unhandledRejection` triggered a full process shutdown. One stray un-awaited rejection killed the app for all users. | **[FIXED]** — now logs only; `uncaughtException` still shuts down (correct). |
| R3 | **Medium** | Rate-limit `Map` keyed by IP was never cleaned → unbounded growth (memory leak on a 256MB box). | **[FIXED]** — periodic reaper (`setInterval(...).unref()`) + `trust proxy` so the real IP is used behind Render. |
| R4 | **Medium** | Numeric route params parsed with `parseInt` and no `NaN` check; `NaN` flowed into queries. | **[FIXED]** on journey/expense paths via `parseId()`; admin paths still use `parseInt` (low risk). |
| R5 | **Low** | `db.ts` uses `ssl: { rejectUnauthorized: false }` in production — disables cert validation (MITM exposure). | **[TODO]** — use the Neon CA / `sslmode=require` with verification. |
| R6 | **Low** | DB connection retries 3× then runs "degraded" forever with no re-arm. Acceptable for now; consider a periodic reconnect. | **[TODO]** |

---

## Phase 2 — Performance

| # | Impact | Finding | Status |
|---|--------|---------|--------|
| P1 | **High** | **Zero secondary indexes.** Every `WHERE driver_id`, `WHERE status`, `WHERE journey_id`, `ORDER BY start_time/timestamp` was a full table scan. | **[FIXED]** — 9 indexes added to `shared/schema.ts` + `migrations/0002_performance_indexes.sql` (idempotent, `CREATE INDEX CONCURRENTLY IF NOT EXISTS`). Run `npm run db:push` or apply the SQL. |
| P2 | **High** | Memory-monitor bug: `heapUsed / 512 / 512` over-reports heap by ~4× (MB is `/1024/1024`). Threshold also mis-set. | **[FIXED]** — correct divisor, threshold 200MB. |
| P3 | **High** | `express.json({ limit: '50mb' })` — a couple of concurrent uploads can OOM a 256MB instance. | **[FIXED]** — lowered to 12MB. **[TODO]:** move journey photos off base64-in-JSON to multipart + object storage; then drop to ~1MB. |
| P4 | **Medium** | N+1: `recalculateAllFinancials` and `recalculate-journey-totals` loop journeys, each doing 2–3 queries; `updateJourneyTotals` re-runs on every expense write. | **[TODO]** — batch into set-based SQL (single `UPDATE ... FROM (SELECT journey_id, SUM(...) ...)`). |
| P5 | **Medium** | `getAllJourneys` (admin) removed its limit — returns **all** journeys with `currentLocation` JSON. Grows unbounded with data; no pagination. | **[TODO]** — add keyset pagination (`WHERE start_time < $cursor LIMIT 20`). |
| P6 | **Medium** | No gzip/compression — JSON payloads sent uncompressed. | **[TODO]** — `app.use(compression())` (add `compression` dep). ~70% smaller JSON. |
| P7 | **Low** | DB pool `max: 2` in prod is fine for 256MB/Neon; `keepAlive: false` + `idleTimeoutMillis: 5000` cause frequent reconnects under steady load. | **[TODO]** — tune once compression/indexes land. |
| P8 | **Info** | Client cache: `staleTime` 30s, `gcTime` 2m, `retry: false`. Reasonable for the RAM budget. Photos correctly excluded from list queries. | OK |

### Indexes added (P1)

```
journeys(driver_id, start_time)   journeys(status)   journeys(start_time)
expenses(journey_id, timestamp)   expenses(category)
salary_payments(user_id)          salary_payments(paid_at)
emi_payments(vehicle_id)          emi_payments(created_at)
```

Expected effect at scale: driver journey list, expense breakdown, and dashboard
aggregates go from sequential scans to index scans — the dominant win as row counts grow.

---

## Phase 3 — Code Quality

| # | Finding | Status |
|---|---------|--------|
| Q1 | `console.log` of full request bodies (incl. base64 photos) and user objects on hot paths — log bloat + PII. | **[FIXED]** on journey/expense create; audit the rest. |
| Q2 | Duplicate `PUT /api/users/:id` (one admin full-update, one unguarded salary-update). Second was dead code (route shadowing) and looked like an unprotected endpoint. | **[FIXED]** — removed. |
| Q3 | Pervasive `any` types (`db: any`, `req/res: any`, `updateData: any`). No real type safety on the DB layer. | **[TODO]** — type `req.user`, drop `db: any`. |
| Q4 | `getFinancialStats` is ~130 lines with several overlapping/contradictory net-profit calculations (`netProfit` computed but then replaced by `calculatedNetProfit`). Hard to trust. | **[TODO]** — extract, unit-test, delete dead computations. |
| Q5 | Inconsistent error-response shape (`{message}` vs `{message, error}` vs `{message, errors}`). | **[TODO]** — standardize an error envelope + a shared `asyncHandler`. |
| Q6 | No JSDoc on the complex financial functions. | **[TODO]** |

---

## Phase 4 — Scalability (architecture for growth)

- **Auth:** move JWT to httpOnly+Secure+SameSite cookies (kills the localStorage XSS theft vector), add short access + refresh tokens and a revocation list. *(addresses S12)*
- **Photos:** object storage (S3/R2) with signed URLs instead of base64 jsonb rows. Removes the single biggest RAM/row-size pressure and lets the body limit drop to ~1MB.
- **Rate limiting:** the in-memory limiter is per-instance and won't hold across replicas. Use `express-rate-limit` + a shared store (Redis/Upstash) and a **stricter login-specific limit** (e.g. 5/min/IP) to stop credential brute force — the current 1000/min global does not protect `/api/auth/login`.
- **DB for 100+ users:** add read replicas / PgBouncer; the per-instance `max: 2` pool won't scale by itself. Partition `journeys`/`expenses` by month once volume grows.
- **Async work:** move recalculation + any future report generation to a job queue (BullMQ) instead of doing it inline in request handlers.
- **Observability:** structured logging (pino) + request IDs; the current `console.log` truncated-to-80-chars logging loses information.

---

## Files changed in this pass

- `server/index.ts` — security headers, `trust proxy`, rate-limit leak fix, memory-math fix, 12MB body limit, error-handler DoS fix, unhandledRejection downgrade.
- `server/routes.ts` — JWT fail-fast, `sanitizeUser`, `parseId`, `authorizeJourneyAccess` (IDOR), admin gates on users list + salaries, `/api/init` hardening, debug-endpoint removal, dead-route removal, error-leak cleanup.
- `server/storage.ts` — `getAllUsers` no longer selects the password hash; added `getJourneyById`.
- `shared/schema.ts` — 9 indexes across journeys/expenses/salary_payments/emi_payments.
- `migrations/0002_performance_indexes.sql` — standalone idempotent index DDL.
- `.gitignore` — ignore `.env*`; `.env.example` added.

## Required deployment actions

1. Set `JWT_SECRET` in the Render environment (the app now refuses to boot in production without it).
2. Apply indexes: `npm run db:push` **or** `psql "$DATABASE_URL" -f migrations/0002_performance_indexes.sql`.
3. **Rotate the admin password** — `admin123` was in source history and must be assumed compromised.
4. To re-seed: set `INIT_SECRET` + `INIT_ADMIN_PASSWORD`, call `POST /api/init` with header `X-Init-Secret`, then unset `INIT_SECRET`.

---

# Pass 2 — Production hardening (verified)

Deps installed, project built, server boot-tested. Results below.

### Fixed in this pass

| Area | Change |
|------|--------|
| **Bug: photos not loading** | Root cause: `insertJourneySchema` omits `photos`, so `zod.parse()` **stripped** them — every journey saved `photos: null`. Uploads silently discarded. Fixed: validate + attach photos after parse, widen `createJourney` signature. New journeys now persist photos. **Historical journeys created before this fix have no photos and cannot be recovered.** |
| **Photo validation** | New `validatePhotos()` — array, ≤7, each a `data:image/` URL, ≤~1.1MB. Caps kept under the 12MB body limit so oversize fails with a clean `400`. |
| **Image lazy loading** | `loading="lazy"` + `decoding="async"` on photo galleries (journey-history, active-journey). Photos already fetch on-demand (modal open). |
| **Route code-splitting** | `App.tsx` pages converted to `React.lazy` + `Suspense`. xlsx (284KB), recharts, and each admin page are now separate chunks — initial bundle no longer ships them. |
| **gzip** | `compression()` added — ~70% smaller JSON. |
| **Security headers** | `helmet()` added (CSP off for the SPA). Verified live: `nosniff`, `X-Frame-Options: SAMEORIGIN`, DNS-prefetch off. |
| **Login brute force** | `express-rate-limit` on `/api/auth/login` + `/api/init`: 10 / 15 min per IP, successful logins exempt. Verified: 10×401 then 429. |
| **DB MITM (S→R5)** | `db.ts` now verifies the TLS cert in production; `DATABASE_SSL_NO_VERIFY=true` is a documented opt-out. |
| **Port binding** | Honors `process.env.PORT` (Render injects it); removed `reusePort` (no benefit single-instance, threw `ENOTSUP` on macOS). |
| **Type/leak cleanups** | `DELETE /api/journeys/:id` no longer leaks `error.message`; uses `parseId`. |

### Verification evidence

- `npm run build` → **green**. 2551 modules, `dist/index.js` 67.2kb, per-page chunks emitted.
- Boot test (production env): `/ping` → 200, `/health` → 503 (correct, no DB).
- JWT guard: production boot **without** `JWT_SECRET` → process refuses to start (as designed).
- helmet headers present on responses; login limiter returns 429 after 10 attempts.
- `tsc` still reports **pre-existing** errors in untouched files (`emi-backup.tsx`, `offlineStorage.ts`, `financial-management.tsx`, `vite.ts`, etc.). The build uses esbuild/vite (types stripped), so these don't block deploy — but they predate this audit and should be cleaned up.

### Known-accepted for a 10-driver internal deployment

- **xlsx ReDoS** (no npm fix): the app only *exports* to Excel, never parses untrusted files, so the ReDoS vector isn't reachable. Migrate to the SheetJS CDN build when convenient.
- **JWT in localStorage**: acceptable for a closed set of trusted users (no public signup). Move to httpOnly cookies if the user base opens up.
- **`getFinancialStats` math**: left as-is — it drives money shown to the client and must not be changed without confirming intended behavior. Needs unit tests before any refactor.
- Remaining `npm audit` items need breaking major bumps of build tooling (vite/esbuild/drizzle-kit); not worth the regression risk on a working build.

## Deploy checklist (do in order)

1. Set env on Render: `DATABASE_URL`, **`JWT_SECRET`** (required — app won't boot without it), `NODE_ENV=production`.
2. Apply indexes once: `npm run db:push` **or** `psql "$DATABASE_URL" -f migrations/0002_performance_indexes.sql` (pick one).
3. **Rotate the admin password** — `admin123` is in git history.
4. Build & start: `npm run build && npm start`.
5. Smoke test: login → start journey **with photos** → admin → journey-history → Photos (confirm the image fix).
