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

- **Sync script**: `scripts/github-sync.cjs` — uses the GitHub Git Data API (blobs, trees, commits, refs) via the connector proxy
- **Post-merge script**: `scripts/post-merge.sh` — runs `pnpm install`, DB migrations, seeding, then GitHub sync
- **Post-merge timeout**: 120 seconds
- **Rate limiting**: 5 concurrent requests with 1.1s delay between batches, plus exponential backoff on 429s
- **Netlify**: picks up new builds automatically from the GitHub repo

## Auto-seeding

The API server automatically seeds canonical agents (De Eindredacteur, De Reviewer, De Boekenschrijver) on startup via `seedScianalystAgents()` from `@workspace/db/seed`. This ensures any new deployment — Replit or otherwise — always has the correct agents with proper `is_synthesizer`/`is_reviewer` flags. The seed is idempotent: it matches by exact canonical name, inserts if missing, and refreshes prompt/role/color/flags on existing rows. It never deletes or modifies user-created agents.

Manual seed: `pnpm --filter @workspace/db run seed:scianalyst`
