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
