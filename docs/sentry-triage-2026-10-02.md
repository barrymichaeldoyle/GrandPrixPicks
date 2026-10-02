# Sentry triage — 2 October 2026

Checked all unresolved issues in `barry-michael-doyle/grand-prix-picks`
over 2020–2026. Two issues remain, both from one feed-detail link:

- [2W](https://barry-michael-doyle.sentry.io/issues/7768676282/): the web
  feed-detail page crashes after `feed:getFeedEvent` fails.
- [2X](https://barry-michael-doyle.sentry.io/issues/7768676351/): production
  rejects `j970sgdd1kgk2c0134x5tmsk3h8fggr6` because its table is
  `predictions`, while the query requires `feedEvents`.

The same ID resolves to a news feed event on personal development
`fine-greyhound-738`. The failing URL opens `grandprixpicks.com`, whose backend
is production `cheery-tern-274`. This is a reference from the wrong deployment.
The inspected link generators use feed-event IDs; the evidence does not show
which tool or caller constructed this particular cross-deployment URL.

## Changes

Added `feed:getFeedEventByRef` for untrusted URL/push references. It normalizes
the reference against `feedEvents` before reading, returning null for malformed
or wrong-table IDs. Web and mobile detail pages use this query and their existing
empty states. The typed `getFeedEvent` API remains available, and both queries
share the original enrichment and access checks. News remains public; player
activity requires a registered viewer. Both queries have return validators.

Regression coverage reproduces the prediction-ID validation failure and checks
the reference lookup, deleted events, signed-out access, unregistered users,
registered viewers, and web query gating/empty states.

## Verification and release status

- Backend: 605 tests passed; one skipped.
- Web: 1,226 tests passed.
- Backend, web and mobile typechecks and lint passed. Web lint retains three
  existing render-purity warnings in unrelated footer/time-format components.
- Changed-file formatting and diff checks passed.
- Backend deployed successfully to development `fine-greyhound-738`.
- Development runtime lookup of the incident's ID successfully returns its
  news event; a malformed reference returns null.

Production and mobile release rollout remain pending. Deploy the backend before
the clients that call the new query. Both Sentry issues remain unresolved until
production verification. A development document ID must not be reused in a
production link, even when it happens to pass that deployment's table checks.
