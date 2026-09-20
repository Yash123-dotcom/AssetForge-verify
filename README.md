# AssetForge Verify

AssetForge Verify is a production-focused compatibility intelligence tool for Unity developers. It estimates whether a third-party asset is likely to fit a project before import, highlights the areas most likely to need work, and produces a durable report that can be shared with a team.

> AssetForge Verify provides a heuristic compatibility score, not a probability, certification, or compatibility guarantee. Always validate an asset in a test project before production use.

**Current version:** v0.7 Private Beta — Accounts and Deep Scan credits

**Live frontend:** [asset-forge-verify-client.vercel.app](https://asset-forge-verify-client.vercel.app/)

## What is implemented

### Branded frontend

- Responsive React interface for desktop, tablet, and mobile
- Editorial AssetForge visual system with branded typography, colors, motion, hover states, and report presentation
- Accessible navigation, skip link, keyboard interactions, visible focus states, ARIA state attributes, and reduced-motion support
- Guided three-step verification workspace: project, asset, and comparison
- Loading, validation, error, empty, and success states
- SPA routing for the homepage, verifier, and durable report pages
- Vercel Web Analytics for page views and existing product events
- First-visit private-beta onboarding and a static demo report
- Print-friendly compatibility reports with link and summary sharing

### Compatibility engine

Each verification evaluates five focused signals:

1. Render pipeline compatibility
2. Unity version compatibility
3. Custom shader risk
4. Dependency risk
5. Target platform compatibility

The server starts from a baseline score of 70, applies the impact from every rule, bounds the result between 0 and 100, and assigns a risk level:

| Score | Risk |
| --- | --- |
| 80–100 | Low |
| 55–79 | Medium |
| 0–54 | High |

Every result includes a score, risk level, plain-language summary, individual check results, and targeted recommendations.

Checks carry `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, or `INFO` severity and are prioritized accordingly. Reports surface the three most important checks before the full breakdown and explain why each compatibility signal matters.

### Unity Asset Store analysis

- Accepts public HTTPS URLs under `assetstore.unity.com/packages/...`
- Extracts available listing metadata such as asset name, publisher, Unity version, render-pipeline support, dependencies, shader signals, platforms, update date, and package version
- Reports confidence per extracted field
- Keeps manual entry and correction available when public metadata is missing or inaccurate
- Stores listing provenance with the resulting report

### Deep Scan

Deep Scan performs static inspection of uploaded `.unitypackage` or gzip-compressed Unity package archives. It combines direct package signals with the existing project compatibility engine while keeping the result advisory.

Current capabilities:

- Package structure and composition inspection
- Script, shader, material, manifest, assembly definition, documentation, and DLL detection
- URP, HDRP, and carefully qualified Built-in pipeline indicators
- A maintainable set of dependency signals such as Cinemachine, TextMeshPro, Input System, Addressables, and Localization
- Unity version hints, editor-only code, conditional compilation, and legacy API indicators
- Severity-ranked package risks integrated into the compatibility report
- Temporary upload processing with result-only persistence

Deep Scan does **not** run Unity, compile scripts, compile shaders, execute uploaded code, load DLLs, render content, or simulate an actual import.

### Product tiers, accounts, and payments

- **Quick Check is free:** anonymous users can analyze a listing, enter metadata manually, create a compatibility report, and share its public URL.
- **Deep Scan uses credits:** one credit pays for one completed static package inspection. Invalid uploads and failed scans do not consume a credit.
- [Supabase Auth](https://supabase.com/docs/guides/auth) provides email/password sign-up, sign-in, password recovery, magic links, session persistence, and sign-out.
- Signed-in users receive a dashboard with their credit balance, Quick Checks, Deep Scans, public report links, payment history, and credit ledger.
- Existing anonymous reports remain public because report ownership is nullable.

[Whop-hosted Checkout](https://docs.whop.com/developer/guides/accept-payments) owns all payment-card collection. The browser submits only a credit-pack identifier and currency; the server resolves the configured Whop Plan ID, credit quantity, and expected amount. Credits are granted only after a signature-verified `payment.succeeded` webhook.

Webhook event IDs, checkout IDs, and ledger references are unique, making retries idempotent. A scan atomically moves one credit from available to reserved, consumes it after a successful saved report, and releases it after parser, infrastructure, or persistence failure. Launch prices are centralized in `server/src/payments/pricing.config.ts`. Credits have no expiry date in the schema or business logic.

Refund webhooks mark the payment `REFUNDED`. Unused purchased credits are reversed when the balance can remain non-negative; otherwise the payment is explicitly flagged for support review instead of silently creating a negative balance. Beta/support grants use the bearer-protected internal endpoint and produce `ADMIN_ADJUSTMENT` ledger entries.

### Reports and community feedback

- Persists verification reports in Supabase
- Generates durable `/report/:id` routes
- Records `WORKED`, `PARTIAL`, or `FAILED` community outcomes
- Accepts an optional feedback comment of up to 500 characters
- Captures an optional structured issue category and derived prediction-alignment signal
- Stores report usefulness (`YES`, `SOMEWHAT`, or `NO`) separately from the real asset outcome
- Displays aggregate outcome totals for each report
- Uses lightweight browser-local duplicate-submission prevention for the interface

### Production safeguards

- Zod validation at API boundaries
- URL validation and restricted Unity Asset Store analysis targets
- CORS allowlist configured through `CLIENT_ORIGIN`
- Helmet security headers and disabled Express fingerprinting
- 32 KB JSON request-body limit
- Separate rate limits for verification, analysis, report reads, and feedback
- Shared Supabase-backed rate-limit storage for serverless production deployments
- Row Level Security on application tables with backend-only service-role access
- Frontend security headers and SPA rewrites configured for Vercel
- No-store API responses, strict production origin validation, and sanitized fallback errors
- Strict bearer-token parsing and fail-closed authentication service errors
- Whop API host allowlisting and server-owned checkout/credit reconciliation
- Multipart field allowlisting, duplicate rejection, and bounded part counts
- Stable API error codes, recovery actions, and privacy-safe structured request logs
- Protected aggregate beta metrics and anonymized scoring-audit endpoints

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS, Lucide icons |
| Backend | Node.js 20+, Express 5, TypeScript, Zod |
| Data | Supabase Postgres and Row Level Security |
| Authentication | Supabase Auth with persistent browser sessions and server-side token verification |
| Payments | Whop-hosted Checkout and Standard Webhooks signature verification behind a provider abstraction |
| Asset metadata | Cheerio-based public listing parser |
| Package inspection | Streaming gzip/tar inspection with bounded static text parsers |
| Testing | Vitest and Supertest |
| Hosting and analytics | Vercel frontend and Quick Check API, dedicated Deep Scan runtime, Vercel Web Analytics |

## Repository structure

```text
AssetForge-verify/
├── client/                         React frontend
│   ├── public/                     Brand assets
│   └── src/
│       ├── components/             Forms, navigation, reports, feedback
│       ├── pages/                  Home, verify, and report pages
│       ├── services/               API and analytics helpers
│       └── types/                  Shared frontend types
├── server/                         Express API
│   ├── src/
│   │   ├── controllers/            HTTP request handlers
│   │   ├── middleware/             Rate limiting and shared store
│   │   ├── parsers/                Asset Store HTML parsing
│   │   ├── security/               Archive paths, upload validation, and limits
│   │   ├── upload/                 Temporary package upload and cleanup
│   │   ├── providers/              Public listing retrieval
│   │   ├── repositories/           Supabase persistence
│   │   ├── rules/                  Five compatibility rules
│   │   ├── services/               Scoring and application logic
│   │   └── validators/             Request and URL validation
│   └── supabase/migrations/        Database migrations
├── .env.example                    Environment variable template
└── package.json                    Root development and validation scripts
```

## Local setup

### Requirements

- Node.js 20 or newer
- npm
- A Supabase project

### 1. Install dependencies

From the repository root:

```bash
npm install
npm install --prefix client
npm install --prefix server
```

### 2. Configure Supabase

Run the migrations in `server/supabase/migrations/` in numeric order:

1. `001_reports_and_feedback.sql` creates reports, feedback, indexes, and RLS configuration.
2. `002_asset_listing_metadata.sql` adds listing metadata and provenance fields.
3. `003_api_rate_limits.sql` creates the shared rate-limit table and atomic consumption function.
4. `004_private_beta_hardening.sql` adds structured feedback, usefulness ratings, normalized comparison fields, beta events, and private-beta indexes.
5. `005_deep_scan.sql` stores result-only Deep Scan summaries and extends allowlisted beta events.
6. `006_accounts_and_billing.sql` adds profiles, report ownership, balances, the credit ledger, reservations, payment records, idempotent webhook processing, atomic billing functions, and account RLS.
7. `007_whop_payments.sql` adds Whop-specific transaction correlation and idempotent purchase, failure, and refund functions.
8. `008_payment_security_hardening.sql` requires signed payment events to match a server-created pending checkout before credits can be minted and hardens refund state transitions.

### 3. Configure environment variables

Use `.env.example` as the template. Create separate `client/.env` and `server/.env` files.

`client/.env`:

```dotenv
VITE_API_URL=http://localhost:4000
VITE_DEEP_SCAN_API_URL=http://localhost:4000
VITE_MAX_PACKAGE_SIZE_MB=250
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-public-key
```

`server/.env`:

```dotenv
PORT=4000
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
TRUST_PROXY_HOPS=0
RATE_LIMIT_STORE=memory
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your-secret-key
INTERNAL_METRICS_TOKEN=replace-with-a-long-random-token
APP_URL=http://localhost:5173
PAYMENT_PROVIDER=whop
DEFAULT_PAYMENT_CURRENCY=INR
WHOP_API_KEY=your-sandbox-api-key
WHOP_COMPANY_ID=biz_your-sandbox-company-id
WHOP_WEBHOOK_SECRET=ws_your-sandbox-webhook-secret
WHOP_API_BASE_URL=https://sandbox-api.whop.com/api/v1
WHOP_API_VERSION_DATE=2026-09-15
WHOP_PLAN_DEEP_SCAN_1_INR=plan_sandbox_inr_1
WHOP_PLAN_DEEP_SCAN_5_INR=plan_sandbox_inr_5
WHOP_PLAN_DEEP_SCAN_15_INR=plan_sandbox_inr_15
WHOP_PLAN_DEEP_SCAN_1_USD=plan_sandbox_usd_1
WHOP_PLAN_DEEP_SCAN_5_USD=plan_sandbox_usd_5
WHOP_PLAN_DEEP_SCAN_15_USD=plan_sandbox_usd_15
DEEP_SCAN_ENABLED=true
MAX_PACKAGE_SIZE_MB=250
MAX_EXTRACTED_SIZE_MB=1000
MAX_ARCHIVE_FILES=20000
MAX_COMPRESSION_RATIO=50
MAX_SINGLE_FILE_SIZE_MB=100
MAX_TEXT_READ_MB=1
DEEP_SCAN_TIMEOUT_SECONDS=120
```

The Supabase secret key is backend-only. Never place it in `client/.env`, expose it in browser code, prefix it with `VITE_`, commit it, or share it publicly. Rotate the key immediately if it is exposed.

### 4. Start both applications

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

The applications can also be started separately:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API health check |
| `POST` | `/api/verify` | Create and persist a compatibility report |
| `POST` | `/api/assets/analyze` | Analyze a public Unity Asset Store listing |
| `GET` | `/api/reports/:id` | Retrieve a public report |
| `POST` | `/api/reports/:id/feedback` | Submit a community outcome and optional comment |
| `GET` | `/api/reports/:id/feedback-summary` | Retrieve aggregate feedback totals |
| `POST` | `/api/reports/:id/usefulness` | Submit a separate report-usefulness rating |
| `POST` | `/api/events` | Record an allowlisted, non-PII beta event |
| `POST` | `/api/deep-scan` | Inspect a multipart Unity package on a Deep Scan-enabled runtime |
| `GET` | `/api/account` | Retrieve the authenticated user's profile, balance, scans, and histories |
| `GET` | `/api/account/credits` | Retrieve the authenticated user's available and reserved credits |
| `GET` | `/api/payments/pricing` | Retrieve centralized credit-pack presentation |
| `POST` | `/api/payments/checkout` | Create authenticated hosted checkout from a server-owned pack ID |
| `GET` | `/api/payments/checkout/:id` | Retrieve an owned checkout record for the success page |
| `POST` | `/api/payments/webhooks/whop` | Receive raw, signature-verified Whop webhook events |
| `GET` | `/api/internal/beta-metrics` | Retrieve aggregate private-beta KPIs using a bearer token |
| `GET` | `/api/internal/scoring-audit` | Export anonymized scoring data using a bearer token |
| `POST` | `/api/internal/grant-credits` | Grant beta/support credits using the protected internal bearer token |

## Whop sandbox setup

Use Whop's sandbox for development so no real payment or production data is involved.

1. Create a sandbox account and API key at `https://sandbox.whop.com`.
2. Create six one-time plans for the 1, 5, and 15 credit packs in INR and USD, then put their `plan_...` IDs in the matching server environment variables. The browser never submits an amount or number of credits.
3. Create a webhook pointing to `https://your-api.example/api/payments/webhooks/whop`. Subscribe to `payment.succeeded`, `payment.failed`, `refund.created`, and `refund.updated`, then copy its `ws_...` signing secret into `WHOP_WEBHOOK_SECRET`.
4. Keep `WHOP_API_BASE_URL=https://sandbox-api.whop.com/api/v1` during development and use Whop's sandbox test cards.
5. Confirm the webhook returns HTTP 200 and the payment changes to `SUCCEEDED`; only then should the credit balance increase. Switch the API URL, credentials, plan IDs, and webhook to production together when going live.

The success redirect is informational. It polls the authenticated server record and never grants credits from its query string. If the redirect fails, the webhook still grants credits and they appear on the next dashboard load.

### Verification example

`POST http://localhost:4000/api/verify`

```json
{
  "project": {
    "unityVersion": "6000",
    "pipeline": "URP",
    "platform": "WINDOWS"
  },
  "asset": {
    "testedUnityVersion": "2022",
    "pipeline": "URP",
    "customShaders": true,
    "dependencies": ["Cinemachine"]
  }
}
```

A successful request returns HTTP `201` with the report `id`, project and asset inputs, score, risk, summary, checks, and recommendations. Invalid input returns HTTP `400` with validation details.

## Validation

Run the complete project checks from the repository root:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The automated suite covers scoring, anonymous Quick Check, authorization middleware, server-owned pricing, Whop webhook signatures, paid-scan reservation and recovery, TTL caching, Asset Store URL validation, archive safety, and static package parsing. Payment tests use test fixtures and mocks; they never call a real payment API.

## Deployment architecture

Quick Check and the frontend remain suitable for the existing two-project Vercel deployment. Deep Scan is intentionally disabled on the Vercel API because Vercel Functions reject request payloads above 4.5 MB, while Deep Scan accepts configurable packages up to 250 MB.

Recommended production architecture:

```text
Vercel frontend
├── Quick Check → Vercel Express API → Supabase
└── Deep Scan   → Dedicated Node runtime → temporary disk → Supabase results
```

The dedicated runtime can use the same `server/` application with `DEEP_SCAN_ENABLED=true`. Set `VITE_DEEP_SCAN_API_URL` on the frontend to that service. Keep `DEEP_SCAN_ENABLED` unset or `false` on the Vercel API.

Uploaded packages are written only to a uniquely named operating-system temporary directory. The scanner streams the gzip/tar archive without extracting entries, stores only normalized scan results, and removes the original temporary upload in a `finally` cleanup path. Startup cleanup removes stale scan directories left by an unexpected process termination.

Archive protections reject absolute or traversal paths, links and device entries, nested archives, invalid gzip signatures, excessive file counts, excessive expanded size, large individual entries, and suspicious compression ratios. Only a bounded prefix of relevant text files is inspected; binaries are never loaded.

## Deploy Quick Check on Vercel

Create two Vercel projects from this repository.

### API project

- Root Directory: `server`
- Framework Preset: Express
- Required environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CLIENT_ORIGIN=https://your-frontend-project.vercel.app`
  - `TRUST_PROXY_HOPS=1`
  - `RATE_LIMIT_STORE=supabase`
  - `APP_URL=https://your-frontend-project.vercel.app`
  - `PAYMENT_PROVIDER=whop`
  - Whop API key, company ID, webhook secret, API version, and configured Plan IDs
- Run all eight Supabase migrations before deploying.
- Set `INTERNAL_METRICS_TOKEN` to a long, random value and send it as `Authorization: Bearer <token>` only from trusted internal tools.

### Frontend project

- Root Directory: `client`
- Framework Preset: Vite
- Required environment variable:
  - `VITE_API_URL=https://your-api-project.vercel.app`
  - `VITE_DEEP_SCAN_API_URL=https://your-dedicated-scan-service.example`
  - `VITE_SUPABASE_URL=https://your-project.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`

Do not include a trailing slash in `CLIENT_ORIGIN` or `VITE_API_URL`. After either URL changes, update the matching environment variable and redeploy both projects. `client/vercel.json` handles SPA rewrites and browser headers; `server/vercel.json` configures the Express function.

## Current limitations

- Quick Check evaluates user-supplied or user-confirmed metadata. Deep Scan inspects a package archive, but neither mode inspects the receiving Unity project itself.
- Public listing extraction can be incomplete when the source page omits information or blocks retrieval.
- Static package inspection cannot reproduce compilation, shader import, native plugin loading, or a real Unity import.
- Deep Scan requires an account and one credit. Subscriptions, teams, custom promo codes, and automatic cash-refund UI are intentionally not part of v0.7.
- The compatibility engine is deterministic guidance and cannot account for every package implementation detail.
- Browser-local duplicate feedback prevention is a usability measure, not a security boundary.
- Community feedback is informational and does not constitute AssetForge certification.

## Private beta goals and KPIs

The private beta is intended to test usefulness, measure scoring accuracy, find misleading rules, and collect real-world import outcomes.

| Area | Suggested KPI |
| --- | --- |
| Activation | Percentage of verification starts that produce a report |
| Usefulness | Percentage of reports rated `YES` or `SOMEWHAT` |
| Accuracy signal | Percentage of import outcomes whose prediction alignment is `ALIGNED` or `PARTIAL` |
| Engagement | Percentage of reports shared by link or summary |
| Growth | Percentage of report viewers clicking through to AssetForge |

The protected metrics endpoint returns aggregates only. The scoring audit omits comments, HTML, IP addresses, and personal data.

## Performance budgets

- Asset URL analysis: target under 5 seconds in normal conditions; the upstream fetch is terminated at five seconds.
- Compatibility verification: target under 500 ms server-side; the deterministic rules are performance-tested.
- Report load: target under 2 seconds on a normal connection.
- Frontend: review the production bundle size on every build and avoid unnecessary dependency growth.

## Roadmap

- **Future AssetForge Verify Pro:** possible monthly Deep Scan allocation, higher package limits, scan comparison, team workspaces, and priority scans. This is a documentation placeholder only; v0.7 has no subscription.
- **v0.8:** Creator verification workflow
- **v1.0:** Public stable release
- **v2:** Local project scanning and Unity-side integration

## Security

Do not open a public issue containing credentials or sensitive deployment details. If a secret is exposed, revoke or rotate it at the provider first, update the Vercel environment variable, and redeploy the API.
