# Convex CI/CD + Migrations

Production deploys ship the **web client and the Convex backend together** from
a single commit, because the Convex deploy runs _inside_ the Cloudflare Pages
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

There is no GitHub Action that deploys Convex — production Convex deploys happen
only via the Cloudflare Pages build. To deploy Convex by hand (e.g. Cloudflare is
down), run `pnpm deploy:backend` locally.

## Cloudflare Pages configuration

1. **Build command:** `bash scripts/cloudflare-build.sh`
2. **Environment variables:**
   - Set `CONVEX_DEPLOY_KEY` to a Convex **Production Deploy Key**, scoped to the
     **Production** environment only. Do **not** set it for Preview — that guard
     is what stops PR previews from deploying to prod.
   - Keep `VITE_CONVEX_URL` (and the Clerk vars) as they are. On production it is
     overridden by the URL `convex deploy` injects; on preview it points the
     preview client at prod Convex.

## GitHub secrets

No secret is needed for deploying — that is driven by `CONVEX_DEPLOY_KEY` in the
Cloudflare Pages Production environment. The GitHub secrets that remain
(`CLERK_*`, `VITE_CLERK_PUBLISHABLE_KEY`, `CONVEX_DEPLOY_KEY`,
`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`) are consumed only by the `web-e2e-smoke`
job in `ci.yml`.

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
