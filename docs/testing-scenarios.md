# Testing Scenarios

For the broader testing entrypoint and command guide, start with [testing.md](/Users/barry/dev/grand-prix-picks/docs/testing.md).

This repo now has a starter testing-scenario scaffold for state-heavy race flows.

The goal is to stop treating the shared dev database as the test harness. Instead, use named, repeatable scenarios that can be applied, summarized, and cleared.

## Layers

Use different tools for different jobs:

- Storybook: fast visual verification of rendering states.
- Convex testing scenarios: realistic app-state setup for web and e2e.
- E2E: smoke coverage for behavior-critical flows only.

## Current Scope

The current scaffold covers these race-detail scenarios:

- `race_upcoming_signed_in_no_picks`
- `race_upcoming_signed_in_complete`
- `race_upcoming_signed_in_top5_only`
- `race_upcoming_signed_in_complete_h2h`
- `race_locked_signed_in_no_picks`
- `race_locked_signed_in_complete_no_results`
- `race_locked_signed_in_complete_h2h_no_results`
- `race_partial_results_standard`
- `race_partial_results_sprint`
- `race_finished_scored_standard`
- `race_finished_scored_sprint`
- `race_finished_scored_h2h_standard`

These definitions live in [scenarioDefinitions.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/lib/testing/scenarioDefinitions.ts).

The Convex API lives in [testingScenarios.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/testingScenarios.ts).

## Scenario Matrix

Use this as the supported QA matrix for the current system.

| Scenario                                        | Weekend  | Predictions | Results  | Purpose                                                                        |
| ----------------------------------------------- | -------- | ----------- | -------- | ------------------------------------------------------------------------------ |
| `race_upcoming_signed_in_no_picks`              | standard | none        | none     | Verify first-run signed-in state before any picks exist.                       |
| `race_upcoming_signed_in_complete`              | standard | top 5 only  | none     | Verify upcoming race with saved top 5 and no H2H warning path.                 |
| `race_upcoming_signed_in_top5_only`             | standard | top 5 only  | none     | Verify the “H2H picks incomplete” prompt on an open session.                   |
| `race_upcoming_signed_in_complete_h2h`          | standard | top 5 + H2H | none     | Verify fully completed upcoming predictions with no incomplete nudges.         |
| `race_locked_signed_in_no_picks`                | standard | none        | none     | Verify post-lock empty state and blocked editing.                              |
| `race_locked_signed_in_complete_no_results`     | standard | top 5 only  | none     | Verify locked weekend with top 5 present and no results yet.                   |
| `race_locked_signed_in_complete_h2h_no_results` | standard | top 5 + H2H | none     | Verify locked weekend with full prediction coverage before result publication. |
| `race_partial_results_standard`                 | standard | top 5 only  | partial  | Verify early-result publishing on a non-sprint weekend.                        |
| `race_partial_results_sprint`                   | sprint   | top 5 only  | partial  | Verify sprint-session result progression and tab state.                        |
| `race_finished_scored_standard`                 | standard | top 5 only  | complete | Verify fully scored standard weekend state and rank visibility.                |
| `race_finished_scored_sprint`                   | sprint   | top 5 only  | complete | Verify fully scored sprint weekend state across all sessions.                  |
| `race_finished_scored_h2h_standard`             | standard | top 5 + H2H | complete | Verify fully scored H2H and Top 5 post-race summaries.                         |

## Principles

- Scenarios are named and intentionally limited.
- Scenario-created data is namespaced.
- The namespace should be stable when you want repeatability.
- Visual-only state coverage should stay out of e2e.
- New scenarios should be added to the catalog first, then implemented as builders.

## Namespace Model

Default namespace format:

- `scenario__${scenarioName}`

Examples:

- `scenario__race_locked_signed_in_complete_no_results`
- `scenario__race_finished_scored_standard`

The namespace is used to generate unique:

- test user IDs
- emails
- race slugs

That lets you clear one scenario without disturbing unrelated state.

## Convex API

The starter API is internal-only and currently exposes:

- `testingScenarios:listScenarios`
- `testingScenarios:applyScenario`
- `testingScenarios:getScenarioSummary`
- `testingScenarios:clearScenario`

## Suggested Usage

Preferred wrapper commands from the repo root:

List available scenarios:

```sh
pnpm scenario -- list
```

Apply a scenario with the default namespace:

```sh
pnpm scenario -- apply race_locked_signed_in_complete_no_results
```

Apply a scenario with a custom namespace:

```sh
pnpm scenario -- apply race_partial_results_standard --namespace scenario__race_partial_results_standard__local
```

Inspect the current seeded state:

```sh
pnpm scenario -- summary --namespace scenario__race_partial_results_standard
```

Clear a scenario namespace:

```sh
pnpm scenario -- clear --namespace scenario__race_partial_results_standard
```

Raw Convex commands are still available when needed:

List available scenarios:

```sh
pnpm --filter @grandprixpicks/backend exec convex run testingScenarios:listScenarios
```

Apply a scenario with the default namespace:

```sh
pnpm --filter @grandprixpicks/backend exec convex run testingScenarios:applyScenario '{"scenario":"race_locked_signed_in_complete_no_results"}'
```

Apply a scenario with a custom namespace:

```sh
pnpm --filter @grandprixpicks/backend exec convex run testingScenarios:applyScenario '{"scenario":"race_partial_results_standard","namespace":"scenario__race_partial_results_standard__local"}'
```

Inspect the current seeded state:

```sh
pnpm --filter @grandprixpicks/backend exec convex run testingScenarios:getScenarioSummary '{"namespace":"scenario__race_partial_results_standard"}'
```

Clear a scenario namespace:

```sh
pnpm --filter @grandprixpicks/backend exec convex run testingScenarios:clearScenario '{"namespace":"scenario__race_partial_results_standard"}'
```

## What The Builders Seed

The builder currently handles:

- namespaced users
- one namespaced race
- top 5 predictions for standard and sprint weekends
- H2H matchup creation when missing
- H2H predictions for complete-prediction scenarios
- partial or complete result publication
- direct top 5 and H2H score rows for scenarios that need visible scoring/rank state

This is enough to support the main race-detail page branches without waiting on the full production scoring pipeline.

## Not Covered Yet

The scaffold still does not model:

- signed-out route behavior
- league membership
- season standings
- admin actor flows
- scenario filtering in the admin picker
- mobile-specific scenario flows

Those should be added incrementally as the current matrix proves itself in day-to-day QA.

## Smoke Coverage

The scenario system now has a lightweight catalog contract test in [testingScenarios.catalog.test.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/testingScenarios.catalog.test.ts).

That test verifies:

- the expected scenario names exist
- names stay unique
- descriptions and surfaces stay populated
- sprint scenarios stay aligned with sprint metadata
- H2H-complete scenarios stay aligned with complete prediction state
- the core race phases remain represented in the matrix

There is now also a minimal Playwright smoke harness split across [public-smoke.spec.ts](/Users/barry/dev/grand-prix-picks/apps/web/tests/e2e/public-smoke.spec.ts), [auth-smoke.spec.ts](/Users/barry/dev/grand-prix-picks/apps/web/tests/e2e/auth-smoke.spec.ts), and [prediction-flow-smoke.spec.ts](/Users/barry/dev/grand-prix-picks/apps/web/tests/e2e/prediction-flow-smoke.spec.ts), with an authenticated setup project in [auth.setup.ts](/Users/barry/dev/grand-prix-picks/apps/web/tests/e2e/auth.setup.ts) and the Playwright config living alongside the web app in [playwright.config.ts](/Users/barry/dev/grand-prix-picks/apps/web/playwright.config.ts).

Current scope:

- seeds a scenario via `pnpm scenario -- apply ...`
- opens the returned public race route
- verifies the seeded page renders
- verifies dev time controls are available in development
- authenticates once up front for auth-only browser smoke flows, then reuses stored session state

Run it from the repo root:

```sh
pnpm test:e2e
```

Run just the seeded Chromium smoke file:

```sh
pnpm test:e2e:smoke
```

Note:

- The current Playwright setup now covers both public and authenticated Clerk-backed smoke flows.
- To run browser tests locally, Playwright browsers may still need to be installed with `pnpm exec playwright install`.
- CI runs the smoke file when these repository secrets are configured:
  - `CLERK_SECRET_KEY`
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `CLERK_JWT_KEY`
  - `VITE_CONVEX_URL`
  - `CONVEX_DEPLOYMENT`
  - `CONVEX_DEPLOY_KEY`

## Adding A New Scenario

When adding a new scenario:

1. Add the name and metadata to [scenarioDefinitions.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/lib/testing/scenarioDefinitions.ts).
2. Add or extend builder logic in [testingScenarios.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/testingScenarios.ts).
3. Ensure `getScenarioSummary` returns enough detail to verify the new state.
4. Add a Storybook fixture using the same scenario name if the UI should be visually reviewed there.
5. Only add e2e coverage if the scenario represents behavior that can regress, not just rendering.

## Recommended Next Steps

- Add a shared Storybook mapping file keyed by the same scenario names.
- Replace ad hoc manual reseeding with `applyScenario`.
- Introduce a frontend `getNow()` abstraction so lock-state edge cases can be visually simulated without reseeding.
- Add a small admin/dev screen later if the CLI flow becomes too slow.
