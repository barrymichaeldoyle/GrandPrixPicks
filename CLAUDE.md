# Grand Prix Picks

F1 prediction game where users pick their top 5 drivers for each session of a race weekend and earn points based on accuracy.

## Tech Stack

- **Frontend**: React 19 + TanStack Router (file-based routing) + TanStack Query
- **Backend/DB**: Convex (backend-as-a-service with real-time subscriptions)
- **Auth**: Clerk (OpenID Connect, JWT verification)
- **Styling**: Tailwind CSS 4
- **Build**: Vite 7 + Nitro (SSR)
- **Deployment**: Cloudflare Pages (via Wrangler)
- **Error Monitoring**: Sentry
- **Testing**: Playwright (E2E), Vitest (unit), Storybook (component)

## Commands

- `pnpm dev` — Start dev servers (Vite port 3000 + Convex, runs concurrently)
- `pnpm build` — Production build
- `pnpm test` — Unit tests (Vitest)
- `pnpm test:e2e` — E2E tests (Playwright)
- `pnpm lint` — ESLint check
- `pnpm format` — Prettier check
- `pnpm check` — Auto-fix lint + format
- `pnpm knip` — Detect unused code/exports
- `pnpm storybook` — Storybook on port 6006

## Project Structure

```
src/
  routes/              # TanStack Router file-based routes
    __root.tsx         # Root layout (providers, theme, header/footer)
    index.tsx          # Home page
    races/index.tsx    # Race calendar listing
    races/$raceId.tsx  # Race detail + prediction form / results
    leaderboard.tsx    # Season standings
    my-predictions.tsx # User's prediction history (auth required)
    admin/             # Admin routes (race management, result publishing)
    terms.tsx, privacy.tsx
  components/          # React components
    PredictionForm.tsx # Drag-and-drop top-5 driver picker
    RaceCard.tsx       # Race display card with countdown
    RaceResults.tsx    # Results table with scoring breakdown
    WeekendPredictions.tsx # Summary of all session predictions
    DriverBadge.tsx    # Team-colored driver display
    Header.tsx         # Nav bar with mobile menu, theme toggle
    Footer.tsx, Badge.tsx, Button.tsx, Flag.tsx, Tooltip.tsx, etc.
  integrations/        # Provider wrappers (Clerk, Convex, TanStack Query)
  lib/
    date.ts            # Date formatting utilities
    sessions.ts        # Session types and ordering
  router.tsx           # TanStack Router config with Sentry
  start.ts             # Server entry with Clerk middleware
  routeTree.gen.ts     # Auto-generated (do not edit)

convex/                # Convex backend
  schema.ts            # Database schema (10 tables)
  lib/
    auth.ts            # getViewer, requireViewer, requireAdmin helpers
    scoring.ts         # scoreTopFive() scoring algorithm
  predictions.ts       # Prediction queries/mutations
  results.ts           # Result publishing + auto-scoring
  races.ts             # Race queries/mutations
  leaderboards.ts      # Season leaderboard with pagination
  drivers.ts           # Driver roster queries
  users.ts             # User profile management
  seed.ts              # 2026 season seeding + test data generators
  testing.ts           # Test utilities
  _generated/          # Auto-generated types (do not edit)
```

## Domain Model

### Session Types

- `quali` — Qualifying (every weekend)
- `sprint_quali` — Sprint Qualifying (sprint weekends only)
- `sprint` — Sprint Race (sprint weekends only)
- `race` — Main Race (every weekend)

**Weekend order**: Sprint weekends: sprint_quali → sprint → quali → race. Regular: quali → race.

### Scoring (`convex/lib/scoring.ts`)

Users pick exactly 5 drivers per session. Points per pick:

- **5 pts** — Exact position match
- **3 pts** — Off by 1 position
- **1 pt** — In actual top 5, off by 2+
- **0 pts** — Not in actual top 5

Max 25 pts/session. Season leaderboard = sum of all session scores.

### Key Business Rules

- Users predict the **next upcoming race only**
- Each session locks independently at its start time
- Cascade mode: one submission applies to all sessions of a weekend
- Specific mode: edit picks for individual sessions
- Admin publishes results per session → auto-calculates all user scores
- Race status: `upcoming` → `locked` → `finished`

### Database Tables (Convex)

`users`, `drivers`, `races`, `predictions`, `results`, `scores`, `h2hMatchups`, `h2hPredictions`, `h2hResults`, `h2hScores`

## Data Fetching

No REST API routes. All data flows through Convex:

```tsx
// In route loaders (SSR)
const race = await convex.query(api.races.getNextRace);

// In components (real-time)
const predictions = useQuery(api.predictions.myWeekendPredictions, { raceId });
const result = useMutation(api.predictions.submitPrediction);
```

## Code Conventions

- **Named exports only** — default exports banned (ESLint rule), except route files and config
- **Import sorting** — enforced by `simple-import-sort` ESLint plugin, use `pnpm lint --fix` rather than manually reordering.
- **Path alias** — `@/*` maps to `./src/*`
- Sentry instrumentation: wrap server functions with `Sentry.startSpan`
- Convex validators: use `v` from `convex/values` (see `.cursorrules` for reference)

## Storybook

- Component stories in `*.stories.tsx` files alongside components

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
