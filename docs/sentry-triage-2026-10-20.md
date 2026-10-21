# Sentry triage — 20 October 2026

A fresh unresolved-issue query covering 2020-01-01 through 2026-10-21 returned
one issue:
[GRAND-PRIX-PICKS-35](https://barry-michael-doyle.sentry.io/issues/7800676378/).
It contains one production event from 19 October at 16:07:46 UTC.

The event records an argument validation failure in `raceNews:publish`.
A Fornaroli reserve/WEC story was submitted with `team` and `dryRun: true`,
but without `raceSlug` or `affectsSessions`. This is a race-independent story
for `globalNews:publish`. Convex rejected the input before running the handler;
the failed call did not publish it. The event does not establish which caller
submitted the payload.

Commit `60ef4747` already added local required-field preflight to
`scripts/gpp.mjs`, including guidance to use `globalNews:publish`. That guard
rejects the reported input. Direct Convex calls can bypass the guard, so the
publishing skill now explicitly documents choosing the correct mutation before
a rehearsal and that `globalNews:publish` does not accept `dryRun`.

Added three CLI regression tests, run by `pnpm test:gpp` and `pnpm test:ci`:

- The reported payload fails locally and names the global publication path.
- A race payload without `affectsSessions` fails locally.
- An invalid later batch item prevents any earlier item from being published,
  including with `--apply`.

All three tests, formatting and diff checks passed. The tests prevent live
Convex access even if preflight regresses. No backend or application runtime
changes, production publication or deployment were needed. The issue is an
operator-input error; retain backend validation rather than accepting an
unscoped story or inventing session impact.

Resolved `GRAND-PRIX-PICKS-35` in Sentry after verification.
