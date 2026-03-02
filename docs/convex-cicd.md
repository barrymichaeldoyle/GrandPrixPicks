# Convex CI/CD + Migrations

This repo now has GitHub Actions for branch validation and Convex deployment:

- `.github/workflows/ci.yml`
- `.github/workflows/convex-production.yml`

## What runs where

1. PR opened/updated:
   - `CI` workflow runs lint, typecheck, and unit tests.
2. `main` push:
   - `CI` runs again.
   - `Convex Production Deploy` deploys to production and runs configured migrations.

Use GitHub environment protection on the `production` environment to require manual approval before production deploy.

## Required GitHub secrets

1. `CONVEX_PROD_DEPLOY_KEY`
   - A Convex Production Deploy Key.

If the production key is missing, the production deploy job is skipped.

## Migration registry

Migrations are defined in:

- `apps/backend/convex/migrations.config.json`

Current entries:

1. `seed:migrateSessionTypes`
2. `leagues:migrateLeagueVisibility`

To add a new migration:

1. Add an idempotent Convex function (mutation/internalMutation).
2. Append it to `apps/backend/convex/migrations.config.json` in execution order.
3. Merge to `main`; preview/prod deploy workflows will run it automatically.

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
