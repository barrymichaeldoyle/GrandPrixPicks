# Convex database I/O

## Shared constructor standings

`constructorPointsCache` stores one small team-to-points summary per season.
Driver lists, H2H views and homepage data share it through
`loadConstructorPoints`. Full championship pages still compute their richer
tables using Convex's automatic query caching.

Mutations that change races, results, drivers or team stints must use the
builders in `convex/lib/standingsMutations.ts`. Triggers remove affected cache
rows in the same transaction and schedule a rebuild after commit. Missing or
outdated cache rows use the original calculation, so rebuilding cannot expose
old points. Timing, notification and recheck metadata do not invalidate points.

The daily `warm missing constructor standings` job bootstraps missing seasons.
It does not expire valid summaries. To warm immediately after deployment, run
`constructorPointsCache:warm` on the intended deployment.

Direct edits in the Convex dashboard and snapshot imports bypass application
triggers. After changing standings inputs this way, run
`constructorPointsCache:rebuild` with `{"season":2026,"force":true}` for each
affected season. Prefer the application mutation paths for corrections.

Bump `CONSTRUCTOR_POINTS_CACHE_VERSION` in `f1Standings.ts` when constructor
point calculations or attribution rules change. Readers immediately use the
live calculation for older versions; the warmer rebuilds them.

## Other read reductions

- Five-minute practice polling uses indexed recent sessions and due rechecks.
  The hourly backfill retains historical recovery.
- Minute-by-minute live classification uses session start indexes instead of
  scanning the calendar while idle.
- Dashboard latest results load one scored weekend and one Top 5 board.
  Profile history retains all weekends.
- Official standings load race and sprint classifications. The qualifying
  championship comparison still loads all four session types.
- Homepage identities use indexed lookups for the five displayed players.
- Owner pick-history queries avoid clock reads; visitor visibility still checks
  session lock times.

Measure database read bytes and call volumes by function in the usage dashboard
after rollout. Compare idle days separately from race weekends, and include dev
usage when assessing the team's quota.
