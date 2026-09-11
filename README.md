# AssetForge Verify

AssetForge Verify is a production-focused web application that helps Unity developers estimate whether a third-party asset is likely to fit their project before importing it. v0.3 can detect public metadata from Unity Asset Store listing URLs while preserving manual entry and correction. The result is an **AssetForge heuristic compatibility score**, not a probability or guarantee.

## Architecture

- `client/` — React, TypeScript, Vite, Tailwind CSS, React Router, and Lucide icons
- `server/` — Node.js, Express, TypeScript, Supabase, Zod validation, independent compatibility rules, repositories, and services
- `server/supabase/migrations/` — database schema for reports and feedback
- The frontend creates a report with `POST /api/verify`, then loads the durable URL `/report/:id` through the reports API.
- The backend validates the request, executes each rule, aggregates score impacts from a base of 70, calculates risk, stores the structured result, and returns targeted recommendations.

## Installation

Requirements: Node.js 20+ and npm.

```bash
npm install
npm install --prefix client
npm install --prefix server
```

Create a Supabase project and run the SQL files in `server/supabase/migrations/` in numeric order.

Copy `.env.example` to `client/.env` and `server/.env`, keeping only `VITE_API_URL` in the client file. The server file needs `PORT`, `CLIENT_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key is backend-only. Never place it in `client/.env` or prefix it with `VITE_`.

## Run locally

Run both applications from the repository root:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:4000`.

Or run them separately:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

## Validation commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## API example

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

The response returns HTTP 201 and contains the public report `id`, project/asset metadata, `score`, `risk`, `summary`, individual `checks`, and `recommendations`. Invalid requests return HTTP 400 with field-level details.

Additional endpoints:

- `GET /api/reports/:id` — retrieve a public report
- `POST /api/reports/:id/feedback` — submit `WORKED`, `PARTIAL`, or `FAILED` feedback with an optional 500-character comment
- `GET /api/reports/:id/feedback-summary` — retrieve aggregate feedback totals
- `POST /api/assets/analyze` — analyze a public HTTPS `assetstore.unity.com/packages/...` listing

## Current limitations

The current version evaluates information supplied or confirmed by the user. URL analysis only reads public listing metadata and may be incomplete or blocked by the source. It does not inspect Unity projects or packages. Browser-local duplicate feedback prevention is intentionally lightweight and is not a security boundary. Results and community feedback are guidance for testing, not compatibility guarantees.

## Roadmap

- **Next:** Unity package metadata scanning
- **v0.4:** Real-world user compatibility feedback
- **v1:** AssetForge Verified system
- **Future:** Creator verification tools and AssetForge marketplace integration
