# Grand Prix Picks

[![CI](https://github.com/barrymichaeldoyle/grand-prix-picks/actions/workflows/ci.yml/badge.svg)](https://github.com/barrymichaeldoyle/grand-prix-picks/actions/workflows/ci.yml)
[![Convex Production Deploy](https://github.com/barrymichaeldoyle/grand-prix-picks/actions/workflows/convex-production.yml/badge.svg)](https://github.com/barrymichaeldoyle/grand-prix-picks/actions/workflows/convex-production.yml)
[![License: Source Available](https://img.shields.io/badge/license-source--available-lightgrey)](https://github.com/barrymichaeldoyle/grand-prix-picks/blob/main/LICENSE)

Predict every Formula 1 weekend. Compete with friends. Track your rank all season.

## Live App

**Primary CTA:** [Play now at grandprixpicks.com](https://grandprixpicks.com)

- Join leagues with friends
- Submit Top 5 + H2H picks each race weekend
- Follow standings and scored results

## What This Repo Is

This repository is source-available for transparency and portfolio/reference purposes.

It is **not open source**. See [LICENSE](./LICENSE) for usage restrictions.

## Follow The Project

- Website: [grandprixpicks.com](https://grandprixpicks.com)
- Support: [grandprixpicks.com/support](https://grandprixpicks.com/support)
- Terms: [grandprixpicks.com/terms](https://grandprixpicks.com/terms)
- Privacy: [grandprixpicks.com/privacy](https://grandprixpicks.com/privacy)

## Engineering Workflow

- CI/CD and Convex migration flow: [docs/convex-cicd.md](./docs/convex-cicd.md)
- Testing conventions: [docs/testing.md](./docs/testing.md)
- Monorepo guide: [docs/monorepo.md](./docs/monorepo.md)

## Monorepo Layout

- `apps/web` - TanStack Start web app (frontend + server routes + build tooling)
- `apps/backend` - Convex backend and migration tooling
