# Grand Prix Picks

F1 prediction game where users pick their top 5 drivers for each session of a
race weekend and earn points based on accuracy. Beyond the core Top 5 game it
also has teammate Head-to-Head (H2H) picks, private leagues, an activity feed,
following/followers, a paid season pass, and push + in-app notifications.

## Monorepo Layout

pnpm workspace (`pnpm-workspace.yaml`) with `apps/*` and `packages/*`:

```
apps/
  web/        # TanStack Router + Vite web app (SSR via Nitro, deployed to Cloudflare Pages)
  mobile/     # Expo / React Native app (iOS + Android, also runs on web via Expo)
  backend/    # Convex backend (schema, queries/mutations, scoring, emails)
packages/
  shared/     # Code shared between web + mobile (e.g. session types, scoring constants)
convex/       # Root-level _generated only — actual Convex code lives in apps/backend/convex
```

Workspace package names:

- `@grandprixpicks/web`
- `@grandprixpicks/mobile`
- `@grandprixpicks/backend`
- `@grandprixpicks/shared`

## Tech Stack

### Web (`apps/web`)

- React 19 + TanStack Router (file-based routing) + TanStack Query
- Tailwind CSS 4
- Vite 7 + Nitro (SSR)
- Cloudflare Pages (via Wrangler)
- Sentry error monitoring
- Playwright (E2E), Vitest (unit), Storybook (component)

### Mobile (`apps/mobile`)

- Expo SDK ~57 + React Native 0.86
- React Navigation (native-stack + bottom-tabs)
- `@clerk/clerk-expo` for auth
- `react-native-mmkv` for storage, `react-native-nitro-modules`
- `expo-notifications`, `expo-apple-authentication`, `expo-haptics`, `expo-secure-store`
- Available Expo skills: `expo-dev-client`, `expo-deployment`, `expo-module`, `building-native-ui`, `expo-tailwind-setup`, `expo-cicd-workflows`, `upgrading-expo`, `use-dom`, `native-data-fetching`, `expo-api-routes`

### Backend (`apps/backend`)

- Convex (backend-as-a-service with real-time subscriptions)
- Clerk for auth (OpenID Connect, JWT verification)
- React Email for transactional emails
- Paddle for billing (season pass) — webhooks verified in the web server layer
- Expo push + web push for notifications

## Commands (run from repo root)

- `pnpm dev` — Web dev (Vite on port 3000); also: `pnpm dev:web`, `pnpm dev:mobile` (Expo), `pnpm dev:backend` (Convex)
- `pnpm ios` / `pnpm android` — Launch Expo on simulator
- `pnpm build` — Web production build
- `pnpm test` / `pnpm test:e2e` — Vitest / Playwright (web only)
- `pnpm lint` / `pnpm lint:fix` — oxlint across web + backend + mobile
- `pnpm format` / `pnpm check` — oxfmt (format / check both)
- `pnpm typecheck` — TS across shared, web, backend (mobile has its own `pnpm --filter @grandprixpicks/mobile typecheck`)
- `pnpm knip` — Detect unused code/exports
- `pnpm storybook` — Storybook on port 6006
- `pnpm deploy` / `pnpm deploy:backend` — Cloudflare Pages / Convex prod

## Project Structure

### `apps/web/src/`

```
routes/                # TanStack Router file-based routes
  __root.tsx           # Root layout (providers, theme, header/footer)
  index.tsx            # Home page (countdown, season strip, teaser sections)
  races/index.tsx      # Race calendar listing
  races/$raceSlug/     # Race detail — resolved by slug (legacy ids redirect)
    index.tsx          # Route component: loader + RaceDetailPage
    -components/        # Page-private components (RaceEventPage, H2H sections)
    -hooks/             # Page-private hooks (useRaceWeekendData)
  leaderboard.tsx      # Season + weekend standings (Top 5 / H2H / combined)
  leagues/             # Private leagues: index, create, $slug, $slug/settings
  feed.tsx + feed/     # Activity feed (+ feed.$feedEventId.tsx detail)
  p/$username/         # Public profiles (+ followers / following lists)
  me.tsx               # Redirect to the signed-in user's profile
  settings.tsx         # Account settings (profile, regional, notifications)
  pricing.tsx, pay.tsx, refund-policy.tsx  # Season pass / Paddle checkout
  support.tsx          # Support request form
  admin/               # Admin routes (race management, result publishing)
  terms.tsx, privacy.tsx
components/            # Shared React components (app-wide)
  PredictionForm.tsx   # Drag-and-drop top-5 driver picker
  RaceScoreCard/       # Per-session picks + results card (composed)
  RaceCard.tsx         # Race display card with countdown
  DriverBadge.tsx      # Team-colored driver display
  H2HMatchupGrid.tsx, H2HPredictionForm.tsx  # Head-to-head UI
  Header.tsx           # Nav bar with mobile menu, theme toggle
  admin/, error/, Button/, UpcomingPredictionBanner/   # Grouped components
integrations/          # Provider wrappers (Clerk, Convex, TanStack Query)
hooks/                 # App-wide custom hooks
lib/
  date.ts              # Date formatting utilities
  sessions.ts          # Session types, labels, weekend ordering
  raceSessions.ts      # Per-session lock/start time helpers
  share.ts             # X (Twitter) share-text builders
  og/                  # OG share-card encoding + image templates (Satori→resvg PNG)
  analytics.ts, site.ts, teamColors.ts, ...
router.tsx             # TanStack Router config with Sentry
start.ts               # Server entry with Clerk middleware
routeTree.gen.ts       # Auto-generated (do not edit)

server/                # Nitro server routes & helpers (outside src/)
  routes/og/share.get.ts          # Per-user OG image rendering
  routes/x.get.ts                 # X share-intent redirect
  routes/sitemap.xml.ts
  routes/api/paddle/*             # Paddle checkout + webhook
  routes/api/clerk/webhook.post.ts
  lib/                            # paddle, clerk, sentry, auth helpers
```

**Route co-location convention**: TanStack treats a leading `-` as "not a
route". Page-private components and hooks live in `-components/` and `-hooks/`
folders next to the route that owns them (see `races/$raceSlug/`). Promote to
top-level `components/` / `hooks/` only when shared across routes.

### `apps/mobile/src/`

```
navigation/            # React Navigation stacks / tabs
screens/               # Top-level screens
components/            # RN components
providers/             # Clerk, Convex, theme providers
integrations/          # Third-party integrations
data/                  # Convex hook wrappers / local data
hooks/                 # (if present) custom hooks
lib/                   # Utilities
theme/                 # Theme tokens / styling
types.ts
```

Mobile entry: `apps/mobile/App.tsx`, `apps/mobile/index.js`, `apps/mobile/app.json`.

### `apps/backend/convex/`

```
schema.ts              # Database schema (see Database Tables below)
lib/
  auth.ts              # getViewer, requireViewer, requireAdmin helpers
  scoring.ts           # scoreTopFive() scoring algorithm
predictions.ts         # Top 5 prediction queries/mutations
results.ts             # Result publishing + auto-scoring (Top 5 + H2H)
races.ts               # Race queries/mutations
drivers.ts             # Driver roster queries
leaderboards.ts        # Season + weekend leaderboards with pagination
h2h.ts                 # Head-to-head matchups, predictions, scoring
leagues.ts             # Private leagues + membership
follows.ts             # Follower / following graph
feed.ts                # Activity feed events + "revs" (kudos)
notifications.ts       # Notification scheduling/batching (nudges, milestones)
push.ts, pushNotifications.ts  # Expo + web push delivery / tokens
inAppNotifications.ts  # In-app notification bell feed
billing.ts             # Season pass entitlement (Paddle)
announcements.ts       # Site-wide admin announcement banner
support.ts             # Support request intake
users.ts               # User profile management + deletion
seed.ts                # 2026 season seeding + test data generators
testing.ts, testingScenarios.ts   # Dev/test utilities + scenario catalog
emails/                # React Email templates
_generated/            # Auto-generated types (do not edit)
```

Many modules have co-located `*.test.ts` files (convex-test based).

## Domain Model

### Session Types

- `quali` — Qualifying (every weekend)
- `sprint_quali` — Sprint Qualifying (sprint weekends only)
- `sprint` — Sprint Race (sprint weekends only)
- `race` — Main Race (every weekend)

**Weekend order**: Sprint weekends: sprint_quali → sprint → quali → race. Regular: quali → race.

### Scoring (`apps/backend/convex/lib/scoring.ts`)

Users pick exactly 5 drivers per session. Scoring is **order-sensitive** — a pick's
points depend on its predicted position (slot 1–5) vs the driver's actual finishing
position. Points per pick, evaluated in order:

- **5 pts** — Exact position match
- **3 pts** — Off by exactly 1 position (this wins even when the driver finishes
  just outside the top 5, e.g. predicted P5, finished P6)
- **1 pt** — Driver finished in actual top 5, off by 2+
- **0 pts** — Otherwise (driver not in top 5 and not off-by-one)

Max 25 pts/session. Season leaderboard = sum of all session scores. Scoring is
identical across every session type (quali / sprint_quali / sprint / race) — there
is one `scoreTopFive()` and no per-session branching in the point math.

### Key Business Rules

- Users predict the **next upcoming race only**
- Each session locks independently at its start time
- Cascade mode: one submission applies to all sessions of a weekend
- Specific mode: edit picks for individual sessions
- Admin publishes results per session → auto-calculates all user scores
- Race status: `upcoming` → `locked` → `finished`
- **H2H**: per-session teammate matchups; pick a winner from each pair, 1 pt per
  correct pick. Fully implemented (predictions, scoring, leaderboard, race UI).
- **Leagues**: private leagues with a shareable slug; members get a league-scoped
  leaderboard and feed.
- **Season pass**: a paid (Paddle) per-season entitlement (`userSeasonPasses`)
  gates premium surfaces.
- **Feed**: activity events (score published, session locked, joined league,
  streak milestone); other users can "rev" (kudos) an event.

### Database Tables (Convex)

Grouped by area (24 tables):

- **Core game**: `users`, `drivers`, `races`, `predictions`, `results`, `scores`,
  `seasonStandings`
- **Head-to-head**: `h2hMatchups`, `h2hPredictions`, `h2hResults`, `h2hScores`,
  `h2hSeasonStandings`
- **Social**: `follows`, `feedEvents`, `revs`, `leagues`, `leagueMembers`
- **Notifications**: `inAppNotifications`, `pushSubscriptions`, `expoPushTokens`
- **Billing / ops**: `userSeasonPasses`, `processedPaddleWebhookEvents`,
  `announcements`, `supportRequests`

## Data Fetching

No REST API routes. All data flows through Convex:

```tsx
// In route loaders (SSR, web)
const race = await convex.query(api.races.getNextRace);

// In components (real-time, web + mobile)
const predictions = useQuery(api.predictions.myWeekendPredictions, { raceId });
const result = useMutation(api.predictions.submitPrediction);
```

## Code Conventions

- **Named exports only** — default exports banned (lint rule), except route files and config
- **Linter**: oxlint (`.oxlintrc.json`), **Formatter**: oxfmt — use `pnpm lint:fix` / `pnpm format` rather than reordering by hand
- **Path alias** — `@/*` maps to `./src/*` within each app
- Sentry instrumentation (web): wrap server functions with `Sentry.startSpan`
- Convex validators: use `v` from `convex/values`

## Storybook

- Component stories in `*.stories.tsx` files alongside web components

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
