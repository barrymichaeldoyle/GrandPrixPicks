# Testing Scenarios

This repo now has a starter testing-scenario scaffold for state-heavy race flows.

The goal is to stop treating the shared dev database as the test harness. Instead, use named, repeatable scenarios that can be applied, summarized, and cleared.

## Layers

Use different tools for different jobs:

- Storybook: fast visual verification of rendering states.
- Convex testing scenarios: realistic app-state setup for web and e2e.
- E2E: smoke coverage for behavior-critical flows only.

## Current Starter Scope

The current scaffold covers six standard-weekend race-detail scenarios:

- `race_upcoming_signed_in_no_picks`
- `race_upcoming_signed_in_complete`
- `race_locked_signed_in_no_picks`
- `race_locked_signed_in_complete_no_results`
- `race_partial_results_standard`
- `race_finished_scored_standard`

These definitions live in [scenarioDefinitions.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/lib/testing/scenarioDefinitions.ts).

The Convex API lives in [testingScenarios.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/testingScenarios.ts).

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

## What The Starter Builders Seed

For the initial six scenarios, the builder currently handles:

- namespaced users
- one namespaced race
- top 5 predictions for standard weekends
- partial or complete result publication
- direct score rows for scenarios that need visible scoring/rank state

This is enough to support the main race-detail page branches without waiting on full automated scoring.

## Not Covered Yet

The starter scaffold does not yet model:

- signed-out route behavior
- sprint weekends
- H2H prediction states
- league membership
- season standings
- admin actor flows
- frontend time overrides

Those should be added incrementally after the first six scenarios are stable.

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
