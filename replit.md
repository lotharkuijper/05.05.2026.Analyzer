# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## GitHub Sync

Automatic sync to GitHub is configured via the post-merge script (`scripts/post-merge.sh`). After every task merge, the script pushes all tracked files to GitHub using the GitHub REST API through the Replit GitHub integration (connector proxy). No PAT or plain-text credentials are needed — authentication is handled by `@replit/connectors-sdk`.

- **Active GitHub repo**: `lotharkuijper/05.05.2026.Analyzer` (migrated 2026-05-05 from `lotharkuijper/29.04.2026.MA.Article.Analyzer`, which is now obsolete)
- **Repo override**: `scripts/post-merge.sh` exports `GITHUB_REPO="lotharkuijper/05.05.2026.Analyzer"` before running the sync. The sandbox prevents direct edits to `.git/config`, so the env var takes precedence over the local Git remote URL.
- **Sync script**: `scripts/github-sync.cjs` — uses the GitHub Git Data API (blobs, trees, commits, refs) via the connector proxy. Reads `GITHUB_REPO` (format `owner/repo`) when set, otherwise parses `git remote get-url origin`.
- **Post-merge script**: `scripts/post-merge.sh` — runs `pnpm install`, DB migrations, seeding, then GitHub sync
- **Post-merge timeout**: 120 seconds
- **Rate limiting**: 5 concurrent requests with 1.1s delay between batches, plus exponential backoff on 429s
- **Manual sync**: `GITHUB_REPO="lotharkuijper/05.05.2026.Analyzer" node scripts/github-sync.cjs`
- **Downstream hosting**: connect Netlify / Vercel to the new repo so it picks up builds automatically.

## Auto-seeding

The API server automatically seeds canonical agents (De Eindredacteur, De Reviewer, De Boekenschrijver) on startup via `seedScianalystAgents()` from `@workspace/db/seed`. This ensures any new deployment — Replit or otherwise — always has the correct agents with proper `is_synthesizer`/`is_reviewer` flags. The seed is idempotent: it matches by exact canonical name, inserts if missing, and refreshes prompt/role/color/flags on existing rows. It never deletes or modifies user-created agents.

Manual seed: `pnpm --filter @workspace/db run seed:scianalyst`

## Auto schema-push on deploy

The API server's production build runs `drizzle-kit push` before bundling so the database schema is always in sync on publish (including first deploys and post-schema-change deploys). This is wired through:

- `artifacts/api-server/package.json` — `build:production` script: `pnpm run db:push && pnpm run build`
- `artifacts/api-server/.replit-artifact/artifact.toml` — `[services.production.build].args` invokes `build:production`

`drizzle-kit push` is idempotent (no-op when the schema already matches). Dev (`pnpm run dev`) intentionally still calls plain `build` — schema sync in dev is handled by `scripts/post-merge.sh`.

**For non-Replit deploy pipelines (e.g. an external CI building the API server):** invoke `pnpm --filter @workspace/api-server run build:production` instead of `build`, otherwise the schema push is skipped and the deployed app may hit "relation does not exist" errors.

## Replit Deployment (Publishing)

The project is configured for one-click publishing on Replit Autoscale. There are **two equivalent production paths**, both verified to work, so the deployment is robust regardless of which one Replit's publisher honors first:

### Path A — Multi-artifact (path-based routing, default for pnpm workspaces)

Each artifact has its own `[services.production]` block in `.replit-artifact/artifact.toml`:

- **`scianalyst` (web, `/`)** — Vite SPA built to `artifacts/scianalyst/dist/public`, served as static files with `/* → /index.html` SPA rewrite (`serve = "static"`).
- **`api-server` (api, `/api`)** — Express bundle (`artifacts/api-server/dist/index.mjs`) run with Node. Build runs `db:push` first (see "Auto schema-push on deploy" above). Startup health check on `/api/healthz`.

The deployment skill notes that in pnpm workspaces, `.replit`'s `[deployment].build`/`run` is ignored and each artifact's `artifact.toml` owns its own build/run. The artifact files are the source of truth.

### Path B — Single-port (Express serves everything)

`artifacts/api-server/src/app.ts` detects `NODE_ENV === "production"` and, if it finds the Vite build at `../../scianalyst/dist/public`, additionally:

- Serves the static assets (`/assets/*`, `/vite.svg`, etc.) with a 1-hour cache.
- Falls back to `index.html` for any non-`/api/*` GET (SPA routes like `/agents`, `/dashboard` resolve to the React app).
- Leaves `/api/*` routes untouched — unknown API paths return a real `404`, never the SPA fallback.

This means the api-server bundle alone is a complete, single-process deployment. Useful as a defensive fallback and for off-Replit hosts (Render, Fly, Railway, etc.).

The root-level `pnpm run build:production` script builds both bundles in one command:

```
PORT=25961 BASE_PATH=/ pnpm --filter @workspace/scianalyst run build && pnpm --filter @workspace/api-server run build:production
```

> Note: `.replit`'s `[deployment].build`/`run` settings are managed by Replit's deployment tooling and cannot be edited from the agent's file editor. In this stack they would be ignored anyway — `artifact.toml` and the root `build:production` script provide the same wiring through the supported paths.

### CORS allow-list

In production (`NODE_ENV === "production"`), the API server restricts CORS to the deployment's own domain(s). The allow-list is built from:

- `REPLIT_DOMAINS` — set automatically by Replit; comma-separated list of all attached domains (the auto-generated `*.replit.app` domain plus any custom domains you've linked in the Publishing UI).
- `ALLOWED_ORIGINS` — optional, comma-separated additional origins. Add an entry here if you need to allow another origin that isn't already attached as a Replit domain (e.g. a separate marketing site that calls the API). Entries can be either a bare host (`example.com`, normalized to `https://example.com`) or a full origin (`https://example.com`).

Same-origin requests from the SPA work without CORS because the frontend and API share the same domain in production. Requests with no `Origin` header (e.g. `curl`, server-to-server) are always allowed. In development, CORS stays fully permissive so the Replit dev preview iframe keeps working.

### Required production secrets

Most are auto-provisioned by Replit integrations and carry over from dev:

- `DATABASE_URL` — provisioned by the Replit PostgreSQL integration. **Required.**
- `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` — provisioned by the Replit AI Integrations (OpenAI proxy). **Required for AI features.**
- `GITHUB_REPO` and Replit GitHub integration credentials — only needed if the post-merge GitHub sync should run in production (normally not — sync runs on the dev container after task merges).

`PORT` and `NODE_ENV` are set automatically by `artifact.toml` and should not be overridden.

### Smoke-tested locally

End-to-end verification before publishing:

- `pnpm run build:production` → `db:push` reports "No changes detected", Vite static bundle + esbuild api-server bundle both produced cleanly.
- `PORT=8090 NODE_ENV=production node artifacts/api-server/dist/index.mjs` → server listens, agent seed completes, and:
  - `GET /api/healthz` → `200 {"status":"ok"}`
  - `GET /` → `200` `index.html` (706 bytes)
  - `GET /assets/index-*.css` → `200` (79 KB built asset)
  - `GET /agents` (SPA route) → `200` `index.html` (fallback works)
  - `GET /api/nonexistent` → `404` (no SPA fallback for API)

### Notes

- Deployment target is `autoscale` (set in `.replit`) — appropriate for this stateless web + REST API stack.
- Geography is locked at first publish; the user selects it in the Publishing UI's Advanced section before clicking Publish (Core/Pro/Enterprise plans only — Free defaults to North America).
