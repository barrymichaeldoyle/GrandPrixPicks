# Backend Audit Follow-Up

Date: 2026-04-03

This is the current handoff note for the backend audit/perf-hardening pass.

## What Changed

- Auth identity lookup now prefers Convex `tokenIdentifier` and falls back to legacy `subject`, with in-place upgrade on existing users.
- Added schema/index support for:
  - `users.deletingAt`
  - `processedPaddleWebhookEvents.by_clerkUserId`
  - `leagues.memberCount`
  - `leagues.adminCount`
  - `leagues.by_season_and_visibility`
  - `leagues.by_createdBy_and_season`
- League queries now use denormalized counts with fallback reads.
- League write paths update `memberCount` and `adminCount`.
- Added admin-triggered league count backfill:
  - `leagues.backfillLeagueCounts`
  - `leagues.backfillLeagueCountsBatch`
- User deletion is now batched/self-scheduling:
  - `users.processUserDeletionBatch`
  - webhook-triggered deletion only schedules cleanup
- Prediction history/profile stats no longer silently truncate at 500 predictions.
- Race leaderboard paths no longer silently truncate at 5,000 score rows.
- Several notification/push fan-out paths were switched from `.collect()` to async iteration or bounded reads.

## Files Touched

- [apps/backend/convex/schema.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/schema.ts)
- [apps/backend/convex/lib/auth.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/lib/auth.ts)
- [apps/backend/convex/users.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/users.ts)
- [apps/backend/convex/leagues.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/leagues.ts)
- [apps/backend/convex/predictions.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/predictions.ts)
- [apps/backend/convex/feed.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/feed.ts)
- [apps/backend/convex/notifications.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/notifications.ts)
- [apps/backend/convex/push.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/push.ts)
- [apps/backend/convex/leaderboards.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/leaderboards.ts)

## Verified

- `pnpm --filter @grandprixpicks/backend typecheck`
- Targeted `oxlint` on touched backend files
- `pnpm --filter @grandprixpicks/backend exec vitest run convex/lib/auth.test.ts convex/leagues.counts.test.ts convex/races.test.ts convex/lib/leaderboard.test.ts convex/notifications.h2h-nudge.test.ts convex/notifications.signup-nudge.test.ts convex/predictions.nudge.test.ts convex/users.admin-prediction-status.test.ts`

Runtime validation completed in the dev deployment:

- User deletion worker:
  - created fixture with follows, predictions, H2H rows, scores, subscriptions, Paddle webhook rows, and three league shapes
  - triggered `users:deleteUserFromClerkWebhookInternal` for the fixture user
  - confirmed `deletingAt` was set immediately
  - confirmed the user was fully deleted
  - confirmed the solo league was deleted
  - confirmed the owned league was reassigned and still had correct `memberCount` and `adminCount`
  - confirmed the shared league dropped to one member and retained correct counts
- League count backfill:
  - created a fixture league with real members but missing `memberCount` and `adminCount`
  - confirmed counts were `null` before the backfill batch
  - ran `leagues:backfillLeagueCountsBatch`
  - confirmed stored counts matched actual membership rows after the batch

## First Things To Do Next

1. Run the league count backfill on the target deployed environment so old leagues stop using fallback membership scans there too.
2. Smoke-test league create/join/leave/promote/demote/remove flows from the app to confirm denormalized counts stay correct through real user entrypoints.
3. Smoke-test race, combined race, and league race leaderboards with existing seeded data.
4. Decide whether to add a focused automated test around duplicate delete webhook deliveries.

## Suggested Commands

From repo root:

```bash
pnpm --filter @grandprixpicks/backend typecheck
pnpm --filter @grandprixpicks/web test:ci
```

After deploying backend functions, trigger the league count backfill:

```bash
pnpm --filter @grandprixpicks/backend dev
```

Then run the admin mutation from Convex dashboard or CLI:

```bash
npx convex run leagues:backfillLeagueCounts
```

Use `--prod` only after verifying on the intended deployment.

## High-Priority Follow-Up

### 1. Production rollout for league count backfill

Main file:
- [apps/backend/convex/leagues.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/leagues.ts)

Status:
- runtime-validated in dev

Remaining work:
- run `leagues:backfillLeagueCounts` or the internal batch on the intended deployment
- verify older production league rows now have `memberCount` and `adminCount`

### 2. App-level verification for denormalized league counts

Main file:
- [apps/backend/convex/leagues.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/leagues.ts)

Status:
- backfill behavior runtime-validated in dev
- deletion-path count maintenance runtime-validated in dev

Still worth checking through app entrypoints:
- `memberCount` and `adminCount` update correctly on:
  - create
  - join
  - leave
  - promote
  - demote
  - remove member
  - delete league
  - admin role changes triggered from the UI

### 3. Add targeted deletion-worker coverage

Main file:
- [apps/backend/convex/users.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/users.ts)

Highest-value additions:
- test duplicate Clerk delete webhook deliveries do not double-schedule meaningful work
- test `processUserDeletionBatch` step progression around `cleanup_leagues`
- document whether `deletingAt` is intentionally preserved only until final user deletion

### 4. Consider further optimization of league leaderboard membership reads

Main file:
- [apps/backend/convex/leaderboards.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/leaderboards.ts)

Current state:
- duplicated membership lookup logic was consolidated
- race score truncation was removed

Potential next step if this becomes hot:
- denormalize league membership snapshots or a membership lookup helper/table if insights show league leaderboard reads are still expensive

### 5. Consider further optimization of result email fan-out

Main file:
- [apps/backend/convex/notifications.ts](/Users/barry/dev/grand-prix-picks/apps/backend/convex/notifications.ts)

Current state:
- large `.collect()` calls were removed from `sendResultEmailsForSession`

Potential next step if still expensive:
- precompute or batch recipient payload generation if Convex insights show this mutation still reads too much

## Nice-To-Have Tests

- Add targeted tests for:
  - identity migration behavior in `lib/auth.ts`
  - league count maintenance in `leagues.ts`
  - batched deletion scheduling in `users.ts`
  - no-truncation leaderboard behavior in `leaderboards.ts`

## Notes

- The highest-risk backend changes now have real runtime validation in dev, not just typecheck/lint.
- The main remaining gap is app-level smoke testing plus running the backfill on the intended deployment.
