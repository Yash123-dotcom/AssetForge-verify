# AssetForge Verify

AssetForge Verify is a production-focused compatibility intelligence tool for Unity developers. It estimates whether a third-party asset is likely to fit a project before import, highlights the areas most likely to need work, and produces a durable report that can be shared with a team.

> AssetForge Verify provides a heuristic compatibility score, not a probability, certification, or compatibility guarantee. Always validate an asset in a test project before production use.

**Current version:** v0.5 Private Beta

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
- Stable API error codes, recovery actions, and privacy-safe structured request logs
- Protected aggregate beta metrics and anonymized scoring-audit endpoints

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS, Lucide icons |
| Backend | Node.js 20+, Express 5, TypeScript, Zod |
| Data | Supabase Postgres and Row Level Security |
| Asset metadata | Cheerio-based public listing parser |
| Testing | Vitest and Supertest |
| Hosting and analytics | Two Vercel projects from one repository, Vercel Web Analytics |

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

### 3. Configure environment variables

Use `.env.example` as the template. Create separate `client/.env` and `server/.env` files.

`client/.env`:

```dotenv
VITE_API_URL=http://localhost:4000
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
| `GET` | `/api/internal/beta-metrics` | Retrieve aggregate private-beta KPIs using a bearer token |
| `GET` | `/api/internal/scoring-audit` | Export anonymized scoring data using a bearer token |

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

The current automated suite covers scoring and verification behavior, TTL caching, Asset Store URL validation, listing parsing, and provider behavior.

## Deploy both applications on Vercel

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
- Run all four Supabase migrations before deploying.
- Set `INTERNAL_METRICS_TOKEN` to a long, random value and send it as `Authorization: Bearer <token>` only from trusted internal tools.

### Frontend project

- Root Directory: `client`
- Framework Preset: Vite
- Required environment variable:
  - `VITE_API_URL=https://your-api-project.vercel.app`

Do not include a trailing slash in `CLIENT_ORIGIN` or `VITE_API_URL`. After either URL changes, update the matching environment variable and redeploy both projects. `client/vercel.json` handles SPA rewrites and browser headers; `server/vercel.json` configures the Express function.

## Current limitations

- The application evaluates user-supplied or user-confirmed metadata; it does not inspect a local Unity project or package.
- Public listing extraction can be incomplete when the source page omits information or blocks retrieval.
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

- **v1.0:** Public release informed by private-beta usefulness and accuracy data
- **v2:** Unity package-level metadata scanning and deeper project configuration analysis
- Future AssetForge Verified creator workflows and marketplace integration

## Security

Do not open a public issue containing credentials or sensitive deployment details. If a secret is exposed, revoke or rotate it at the provider first, update the Vercel environment variable, and redeploy the API.
