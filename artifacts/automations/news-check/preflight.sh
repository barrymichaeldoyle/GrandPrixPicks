#!/usr/bin/env bash
set -euo pipefail

# Run at task start, not during a cached dependency setup. Never echo secrets.
: "${GPP_CONVEX_PROXY_URL:?Production Convex network-secret proxy is missing}"
: "${BUFFER_API_KEY:?Buffer CLI credential is missing}"
: "${NODE_USE_ENV_PROXY:?Node must use the cloud network-secret proxy}"
test "$GPP_CONVEX_PROXY_URL" = 'https://cheery-tern-274.convex.cloud'
test "$NODE_USE_ENV_PROXY" = '1'
command -v node >/dev/null
command -v pnpm >/dev/null
command -v buffer >/dev/null
test -f .claude/skills/publish-race-news/SKILL.md
test -x apps/backend/node_modules/.bin/convex

pnpm gpp race --prod
buffer channels list \
  --organization-id 64f9a17b902afdecc48c8d02 \
  --fields id,name,service,timezone \
  --output json
pnpm gpp news social check --prod

printf '%s\n' 'Read-only service checks and authoritative shared ledger read passed. Applies acquire the distributed Git lock automatically.'
