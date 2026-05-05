#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter db push
pnpm --filter db run seed:scianalyst

echo "Syncing to GitHub..."
export GITHUB_REPO="lotharkuijper/05.05.2026.Analyzer"
if ! node scripts/github-sync.cjs 2>&1; then
  echo "ERROR: GitHub sync failed. The downstream deployment will not pick up these changes."
  echo "ACTION: Re-run manually with 'GITHUB_REPO=$GITHUB_REPO node scripts/github-sync.cjs' or check the GitHub integration connection."
fi
