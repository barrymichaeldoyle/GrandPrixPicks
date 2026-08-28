# Product analytics

PostHog is a decision-support system, never the source of truth for picks,
scores, membership, or billing. Web, mobile, and server events share one EU
project and the same canonical outcome names.

## Canonical outcomes

| Event                    | Required properties                              | Meaning                                                          |
| ------------------------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| `prediction_saved`       | `prediction_type`, `scope`, `platform`           | A Top 5 or H2H save was accepted.                                |
| `prediction_save_failed` | `prediction_type`, `scope`, `reason`, `platform` | A save failed with a bounded reason code.                        |
| `screen_viewed`          | `screen`, `platform`                             | A mobile navigation route became active.                         |
| `purchase_completed`     | `season`, `platform`, `entitlement_created`      | Paddle's signed webhook was accepted and the entitlement exists. |

`prediction_type` is `top5` or `h2h`. `scope` is `cascade` or `session`.
Failure `reason` is one of `locked`, `unauthorized`, `validation`, `network`,
`rate_limited`, or `unknown`. Never use raw exception messages as dimensions.

Event names and bounded error normalization live in
`packages/shared/src/analytics.ts`. Do not add platform-specific aliases for a
shared product outcome.

## Privacy

- Web capture is consent-gated and manual-only; DOM autocapture is disabled.
  Session replay uses the same gate and masks every text node and input.
- Mobile capture is manual-only and requires an explicit first-run choice that
  is stored on-device and reversible in Settings.
- Identify with the Clerk user ID only. Email, name, username, picks, feedback
  text, and other user content do not belong in PostHog properties.
- Derive `$internal_or_test_user` locally from the signed-in email domain; send
  only the boolean so internal traffic can be excluded without storing email.
- Server purchase events use Paddle's event ID as `$insert_id` for deduplication.

## Mobile production verification

After configuring `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` in
the EAS production environment, exercise a production/TestFlight build and
confirm Live Events receives all of the following with `platform: ios` or
`platform: android`:

1. `screen_viewed` when moving between Home, Picks, Leaderboard, and More.
2. `auth_started` and `auth_completed` for one sign-in.
3. `prediction_saved` for both `top5` and `h2h`.
4. `push_permission_result` and `notification_opened`.
5. `$identify` on sign-in and a new anonymous distinct ID after sign-out.

Confirm no driver selections, email addresses, names, or usernames appear in
the captured properties before approving the release.

## Managed insights

Run `pnpm --filter web posthog:setup` after changing the catalog or funnels.
The script updates legacy insight names and keeps route/property filters in
source control. Test-account filtering remains enabled on every managed funnel.

The managed dashboard includes the core conversion funnels, the detailed
landing-picker handoff, weekly unique product outcomes, daily analytics health,
and predictor retention. The dashboard is pinned in PostHog so it is the
default decision surface. Operational alerts check ingestion and checkout
failures daily. The weekly prediction-activity alert exists but stays disabled
until `prediction_saved` has a real production baseline.

Pageviews store a pathname-only `path`. Query strings are intentionally omitted
to avoid fragmenting route metrics; acquisition dimensions live in the bounded
`utm_source`, `utm_medium`, and `utm_campaign` properties instead.

PostHog also cleans dynamic route segments into stable templates for race,
league, profile, feed-event, and admin-race pages. New insights exclude test
accounts by default, internal accounts carry only a boolean marker, and project
IP anonymization is enabled.

Production browser traffic should use a first-party ingestion host. When
`VITE_POSTHOG_HOST` is omitted, the web app falls back to its same-origin
`/ingest` route; the current production deployment uses
`https://t.grandprixpicks.com`.
