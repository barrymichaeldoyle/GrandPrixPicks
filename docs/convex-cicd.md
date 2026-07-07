# Convex CI/CD + Migrations

Production deploys ship the **web client and the Convex backend together** from
a single commit, because the Convex deploy runs *inside* the Cloudflare Pages
build (the same way our Vercel projects deploy Convex during their build).

## What runs where

1. PR opened/updated:
   - `CI` (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and the
     e2e smoke.
   - Cloudflare Pages builds a **preview**. No `CONVEX_DEPLOY_KEY` is set for the
     Preview environment, so the preview build skips the Convex deploy and just
     builds the web app (pointing at prod Convex via `VITE_CONVEX_URL`).
2. `main` push:
   - `CI` runs again.
   - Cloudflare Pages builds **production** via `scripts/cloudflare-build.sh`,
     which runs `convex deploy` (functions live first) → prod migrations → web
     build against the just-deployed backend, then publishes. If the Convex
     deploy fails, the whole build fails and nothing is published.

There is no longer a GitHub Action that deploys Convex on push.
`.github/workflows/convex-production.yml` is kept as a **manual break-glass**
(Actions tab → Run workflow) for deploying Convex without a web deploy.

## Cloudflare Pages configuration

1. **Build command:** `bash scripts/cloudflare-build.sh`
2. **Environment variables:**
   - Set `CONVEX_DEPLOY_KEY` to a Convex **Production Deploy Key**, scoped to the
     **Production** environment only. Do **not** set it for Preview — that guard
     is what stops PR previews from deploying to prod.
   - Keep `VITE_CONVEX_URL` (and the Clerk vars) as they are. On production it is
     overridden by the URL `convex deploy` injects; on preview it points the
     preview client at prod Convex.

## Required GitHub secrets

Only the manual break-glass workflow needs one:

1. `CONVEX_PROD_DEPLOY_KEY`
   - A Convex Production Deploy Key. If missing, the manual deploy job is skipped.

## Migration registry

Migrations are defined in:

- `apps/backend/convex/migrations.config.json`

Current entries:

1. `seed:migrateSessionTypes`

To add a new migration:

1. Add an idempotent Convex function (mutation/internalMutation).
2. Append it to `apps/backend/convex/migrations.config.json` in execution order.
3. Merge to `main`; the Cloudflare production build runs it automatically after
   `convex deploy` (via `pnpm cf:postdeploy`).

## Local migration commands

Run all configured migrations:

```bash
pnpm convex:migrations
```

Run on production:

```bash
pnpm convex:migrations:prod
```

Dry run (print commands only):

```bash
pnpm convex:migrations --dry-run --prod
```

Run specific migrations:

```bash
pnpm convex:migrations --only seed:migrateSessionTypes
```
