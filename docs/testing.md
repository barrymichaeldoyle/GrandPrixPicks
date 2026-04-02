# Testing

This repo has three testing layers. Use the lightest one that can prove the behavior you care about.

## Layers

1. Unit and component tests
   - Web and shared client code: `apps/web/src/**` with `*.test.ts` or `*.test.tsx`
   - Convex backend logic: `apps/backend/convex/**` with `*.test.ts`
2. Scenario-driven visual verification
   - Named Convex scenarios for stateful app setup
   - Storybook states for fast visual review
3. Playwright smoke tests
   - Browser-level checks for a small set of high-risk flows

## Main Commands

1. Fast unit checks
   - `pnpm test`
2. Full repo checks
   - `pnpm ci:check`
3. Scenario-based browser smoke suite
   - `pnpm test:e2e:smoke`
4. Full Playwright run
   - `pnpm test:e2e`
5. Local auto-fix
   - `pnpm fix`

## Scenario Workflow

Use named scenarios instead of hand-editing the dev database.

1. List scenarios
   - `pnpm scenario -- list`
2. Apply a scenario
   - `pnpm scenario -- apply race_locked_signed_in_complete_h2h_no_results`
3. Inspect the seeded state
   - `pnpm scenario -- summary --namespace scenario__race_locked_signed_in_complete_h2h_no_results`
4. Clear a scenario namespace
   - `pnpm scenario -- clear --namespace scenario__race_locked_signed_in_complete_h2h_no_results`

The full scenario catalog, matrix, and CI requirements live in [testing-scenarios.md](/Users/barry/dev/grand-prix-picks/docs/testing-scenarios.md).

## Playwright Scope

Keep browser coverage intentionally small.

- `[public]` files cover unauthenticated routes and dev-time controls.
- `[auth]` files cover Clerk-backed signed-in state.
- `[flow]` files cover real user actions like submit, edit, and lock transitions.

Current smoke ownership lives under [apps/web/tests/e2e](/Users/barry/dev/grand-prix-picks/apps/web/tests/e2e).
The smoke script runs with a single Playwright worker because the suite talks to shared Clerk and Convex test state.
Authenticated browser tests now use a dedicated Playwright setup project that signs in once and reuses stored session state for the auth and flow projects.

## Naming and Style

1. Prefer deterministic fixtures and explicit assertions.
2. Add `data-testid` only where Playwright needs a stable hook.
3. Mock time for unit tests; use the dev-time controls for browser testing.
4. Avoid snapshot-heavy tests for business logic.
5. Keep smoke flows high-signal and hard to regress, not exhaustive.

## CI

`web-e2e-smoke` is the browser smoke gate and should be required in branch protection.

Required CI secrets for the browser suite are documented in [testing-scenarios.md](/Users/barry/dev/grand-prix-picks/docs/testing-scenarios.md).
