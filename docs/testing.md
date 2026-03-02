# Testing Conventions

This repo uses Vitest for unit tests.

## Test locations

1. Frontend/UI/shared client utilities:
   - Place tests next to source under `apps/web/src/**` using `*.test.ts` or `*.test.tsx`.
2. Convex backend logic and query/mutation behavior:
   - Place tests next to source under `apps/backend/convex/**` using `*.test.ts`.
3. Integration-style unit tests with mocks:
   - Keep them near the module they validate (`apps/web/src/**` or `apps/backend/convex/**`) and mock external dependencies.

## Naming and style

1. Prefer one test file per source module.
2. Use deterministic fixtures and explicit assertions.
3. Mock time (`Date.now`) and browser APIs where needed.
4. Avoid snapshot-heavy tests for business logic.

## Commands

1. Fast checks:
   - `pnpm test`
2. Full CI-equivalent checks:
   - `pnpm run ci:check`
3. Local auto-fix:
   - `pnpm run fix`
