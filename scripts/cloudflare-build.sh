#!/usr/bin/env bash
#
# Cloudflare Pages build entrypoint.
#
# Set this as the Pages project "Build command":
#   bash scripts/cloudflare-build.sh
#
# On PRODUCTION builds (CONVEX_DEPLOY_KEY set, scoped to the Production
# environment only) this deploys the Convex backend FIRST, runs prod
# migrations, then builds the web bundle against the just-deployed backend.
# `convex deploy --cmd` injects the deployment URL as VITE_CONVEX_URL, so the
# published client is always built against the backend that is already live.
#
# On PREVIEW builds (no CONVEX_DEPLOY_KEY) we skip the Convex deploy entirely
# and just build the web app, which reads VITE_CONVEX_URL from the Pages
# Preview environment (points at prod Convex, same as before).
set -euo pipefail

if [ -z "${CONVEX_DEPLOY_KEY:-}" ]; then
  echo "No CONVEX_DEPLOY_KEY — preview build: building web only."
  pnpm --filter @grandprixpicks/web build:cf
  exit 0
fi

echo "CONVEX_DEPLOY_KEY present — production build."
echo "Deploying Convex, running migrations, then building web against it."

# convex deploy runs from the backend package dir and only runs --cmd once the
# functions are live. `pnpm -w run cf:postdeploy` runs migrations + web build
# from the workspace root with VITE_CONVEX_URL injected for the whole subtree.
cd apps/backend
npx convex deploy --yes --typecheck disable \
  --cmd-url-env-var-name VITE_CONVEX_URL \
  --cmd 'pnpm -w run cf:postdeploy'
