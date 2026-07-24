# Grand Prix Picks

[![CI](https://github.com/barrymichaeldoyle/GrandPrixPicks/actions/workflows/ci.yml/badge.svg)](https://github.com/barrymichaeldoyle/GrandPrixPicks/actions/workflows/ci.yml)
[![License: Source Available](https://img.shields.io/badge/license-source--available-lightgrey)](https://github.com/barrymichaeldoyle/GrandPrixPicks/blob/main/LICENSE)

Predict every Formula 1 weekend. Compete with friends. Track your rank all season.

**[Play now at grandprixpicks.com →](https://grandprixpicks.com)**

## About

Grand Prix Picks is an F1 prediction game. Each race weekend you pick your top 5
drivers per session and earn points based on accuracy. Beyond the core Top 5 game
it also has teammate Head-to-Head (H2H) picks, private leagues, an activity feed,
following/followers, a paid season pass, and push + in-app notifications.

- **Top 5** — order-sensitive picks per session (5 / 3 / 1 / 0 points each)
- **Head-to-Head** — call the winner of each teammate matchup
- **Leagues** — private, shareable leaderboards for you and your friends
- **Season standings** — every session score rolls up across the year

## Tech Stack

| Area    | Stack                                                                 |
| ------- | --------------------------------------------------------------------- |
| Web     | React 19, TanStack Router + Start, Vite + Nitro (SSR), Tailwind CSS 4 |
| Mobile  | Expo (iOS + Android), React Native, React Navigation                  |
| Backend | Convex (real-time DB, queries/mutations, scoring, emails)             |
| Auth    | Clerk (web + mobile), synced to Convex users                          |
| Billing | Paddle (season pass)                                                  |
| Hosting | Cloudflare Pages (web) · Expo / EAS (mobile)                          |

## Monorepo Layout

pnpm workspace (`apps/*` and `packages/*`):

- `apps/web` — TanStack Start web app (frontend + SSR server routes + build tooling)
- `apps/mobile` — Expo / React Native app (also runs on web via Expo)
- `apps/backend` — Convex backend (schema, queries/mutations, scoring, emails)
- `packages/shared` — code shared between web and mobile (session types, scoring constants)

See [docs/monorepo.md](./docs/monorepo.md) for the full guide.

## Engineering Docs

- Monorepo guide — [docs/monorepo.md](./docs/monorepo.md)
- CI/CD and Convex migration flow — [docs/convex-cicd.md](./docs/convex-cicd.md)
- Testing conventions — [docs/testing.md](./docs/testing.md)
- Mobile API contract — [docs/mobile-api-contract.md](./docs/mobile-api-contract.md)

## License

This repository is **source-available** for transparency and portfolio/reference
purposes. It is **not open source** — see [LICENSE](./LICENSE) for usage
restrictions.

## Links

- Website — [grandprixpicks.com](https://grandprixpicks.com)
- Support — [grandprixpicks.com/support](https://grandprixpicks.com/support)
- Terms — [grandprixpicks.com/terms](https://grandprixpicks.com/terms)
- Privacy — [grandprixpicks.com/privacy](https://grandprixpicks.com/privacy)
