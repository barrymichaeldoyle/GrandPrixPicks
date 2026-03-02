# Monorepo Guide

## Workspace layout

- `apps/web` — TanStack Start web app (UI, SSR/server routes, web build tooling)
- `apps/backend` — Convex backend workspace
  - `apps/backend/convex` is the Convex functions folder expected by Convex CLI
- `packages/shared` — shared pure TypeScript domain utilities used by multiple apps

## Import rules

- Keep cross-app shared logic in `packages/shared/src`.
- Import shared modules via package paths:
  - `@grandprixpicks/shared/raceTimezones`
  - `@grandprixpicks/shared/sessions`
- Do not import app internals across workspaces (e.g. web importing backend source files directly).

## Scripts from repo root

- `pnpm dev` / `pnpm dev:web` — start web app and linked backend dev flow
- `pnpm dev:backend` — run Convex backend dev
- `pnpm typecheck` — shared + web + backend typecheck
- `pnpm lint` — web + backend lint
- `pnpm test:ci` — web tests
- `pnpm knip` — root monorepo unused-code/dependency analysis
- `pnpm ci:check` — lint + typecheck + tests + knip

## TypeScript structure

- `tsconfig.base.json` at repo root contains shared compiler defaults.
- Workspace tsconfigs extend the base config:
  - `apps/web/tsconfig.json`
  - `apps/backend/convex/tsconfig.json`
  - `packages/shared/tsconfig.json`
- Root `tsconfig.json` contains project references for editor/build graph visibility.

## Environment variables

- Root `.env.local` is the source of truth.
- Web and backend scripts load root env explicitly (for consistent local behavior).
