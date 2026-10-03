# Sentry triage — 3 October 2026

Checked unresolved issues across `barry-michael-doyle` over
2020-01-01–2026-10-04. Grand Prix Picks had two unresolved issues, both
from the invalid feed reference investigated on 2 October.

## Grand Prix Picks: verified and resolved

- [2W](https://barry-michael-doyle.sentry.io/issues/7768676282/): feed-detail
  crash after the typed feed lookup rejected the URL reference.
- [2X](https://barry-michael-doyle.sentry.io/issues/7768676351/): the same
  reference was a `predictions` ID in production, not a `feedEvents` ID.

The existing fix in `854dcd05` is now serving in production. The live
feed-detail asset calls `feed:getFeedEventByRef` with the URL as `ref`.
Opening the original failing URL in a signed-in Chrome session rendered
“Prediction not found” and the existing unavailable-item description.
There were no console errors. This confirms the production backend and
web client handle the incident's reference without the original crash.

Both issues were marked resolved in Sentry after this verification. No
application code changes or deployments were necessary in this session.
This verification does not establish mobile release rollout or repair
the original cross-deployment news link.

## Validation

- Backend suite: 605 passed; one skipped.
- Web suite: 1,236 passed.
- Both suites include the existing feed-detail regression tests for
  invalid and wrong-table references, deleted events, access controls,
  query gating, and empty states.
- Recent production smoke workflows for `854dcd05` succeeded.

## Other project

[REPORT-BUDDY-P](https://barry-michael-doyle.sentry.io/issues/7635709382/)
is a hydration issue on `https://report-buddy.com/admin/users`, last seen
24 September. It belongs to the separate Report Buddy repository and
remains unresolved. The latest event provides neither a component stack
nor a server/client hydration comparison. The users page formats dates
using the host's default time zone, which can produce different calendar
dates on the server and browser; that is a candidate defect, not a
confirmed cause of this event.
