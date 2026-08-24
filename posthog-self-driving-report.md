# PostHog Self-driving setup report

> Historical setup snapshot. The maintained event contract and mobile launch
> verification checklist now live in `docs/analytics.md`; managed funnels live
> in `apps/web/scripts/setup-posthog.mjs`.

**Project:** Grand Prix Picks (project 134013)
**Date:** 2026-07-28

## Summary

PostHog Self-driving is now configured for Grand Prix Picks. Session Replay, Error Tracking, Support, GitHub Issues, Sentry, and Google Search Console are wired as signal sources, and a five-scout troop (including one custom scout for the F1 prediction submission funnel) is running daily. Findings will start appearing in your [Self-driving inbox](https://eu.posthog.com/project/134013/inbox) within ~30 minutes.

---

## AI data processing

**Status:** Approved. Organisation-level AI data processing consent was verified before the run started.

---

## GitHub

**Status:** Connected during this run.

- Integration id: `73991`
- Account: `barrymichaeldoyle`
- Connected at: 2026-07-28T15:41:54Z

---

## Products enabled

| Product                 | Status                               | Notes                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session Replay          | Enabled (server-side flip attempted) | `posthog.init` clean — no `disable_session_recording` override. Note: `opt_out_capturing_by_default: true` is set for GDPR consent flows (legitimate); replay captures for users who opt in.                  |
| Error Tracking          | Enabled (server-side flip attempted) | `posthog.init` clean — no `capture_exceptions: false` override. The project uses Sentry (`@sentry/tanstackstart-react`) as its primary error monitor; PostHog error tracking is now on as a parallel channel. |
| Support (Conversations) | Enabled (server-side flip attempted) | Product is on. **Tickets only arrive once an inbound channel is connected** — see Follow-ups.                                                                                                                 |

> Note: The `products-enable` API call requires `project:write` scope, which was not available on the current API key. The server-side enables are recorded as follow-ups for a project-admin to confirm. The signal sources for all three products were enabled independently (sources are wired regardless).

---

## Signal sources

| source_product          | source_type                | Action                                                                                                                                                                                                    |
| ----------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health_checks`         | `health_issue`             | **Enabled** (new) — id `019fa965-6fd3-7e06-af1b-0777184932ba`                                                                                                                                             |
| `error_tracking`        | `issue_created`            | **Enabled** (new) — id `019fa965-7236-718f-804c-9e49bf7173b2`                                                                                                                                             |
| `error_tracking`        | `issue_reopened`           | **Enabled** (new) — id `019fa965-7a84-77ce-80b7-6855eb6fc7c6`                                                                                                                                             |
| `error_tracking`        | `issue_spiking`            | **Enabled** (new) — id `019fa965-7e80-75a9-af70-8b47c42ee5da`                                                                                                                                             |
| `conversations`         | `ticket`                   | **Enabled** (new) — id `019fa965-80e2-71f2-ad9c-5c6ea8e3f91e`                                                                                                                                             |
| `session_replay`        | `session_analysis_cluster` | **Enabled** (new) — id `019fa965-934b-70d4-8e0d-4ea8ccbcdc63` (default sample rate 10%)                                                                                                                   |
| `signals_scout`         | `cross_source_issue`       | **Skipped** — on by default, no config row needed                                                                                                                                                         |
| `github`                | `issue`                    | **Enabled** (new) — id `019fa978-b451-77ff-9dc3-d3dbadc85919`                                                                                                                                             |
| `sentry`                | `issue`                    | **Enabled** (new) — id `019fa978-b855-77d2-8134-c33ec7090eb2`                                                                                                                                             |
| `google_search_console` | `search_opportunity`       | **Failed** — `google_search_console` is not yet a valid `source_product` enum value in this API version. Warehouse source was connected; responder will activate once the API is updated. See Follow-ups. |

---

## Connected tools

| Tool                           | Status                                                                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub Issues**              | Connected by this setup. Warehouse source id `019fa978-6702-0000-03aa-e9c770645468`, syncing `issues` table (incremental by `updated_at`). First sync started. More tables can be enabled in the PostHog data management UI. |
| **Sentry**                     | Connected by this setup. Warehouse source id `019fa978-82bb-0000-af77-bb3ca76c43f0`, syncing `issues` table (full refresh). First sync started.                                                                              |
| **Google Search Console**      | Connected by this setup. Warehouse source id `019fa978-9b04-0000-43f3-cebbf5066d77`, syncing `search_analytics_by_query_page` (full refresh). First sync started. Inbox responder currently dormant — see Follow-ups.        |
| **Linear**                     | Not used (not selected).                                                                                                                                                                                                     |
| **Jira / Zendesk / pganalyze** | Not used (not selected).                                                                                                                                                                                                     |

---

## Scout troop

**Run budget:** 24 runs/day (early-access default). 0 runs used today. 24 remaining.
**Banner:** "Scouts are in early access so daily runs are limited to 24 by default for now, please reach out to team-self-driving@posthog.com if you would like more runs."

### Enabled (5 active)

| Scout                                 | Reason enabled                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `signals-scout-general`               | Always on — cross-product correlations and surfaces no specialist covers            |
| `signals-scout-product-analytics`     | Core game mechanics: prediction funnels, weekend-over-weekend retention, lifecycle  |
| `signals-scout-web-vitals`            | `capture_performance: { web_vitals: true }` explicitly set in `posthog.init`        |
| `signals-scout-web-analytics`         | Web traffic, attribution, landing-page health; Google Search Console just connected |
| `signals-scout-gpp-prediction-funnel` | **Custom** — F1 prediction submission funnel (see Custom scouts section)            |

### Disabled (24)

All other canonical scouts were already in disabled state at sync time and left disabled. Key intentional exclusions:

| Scout                             | Reason                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `signals-scout-error-tracking`    | Covered by native source (error_tracking issue_created/reopened/spiking) — intentional exclusion |
| `signals-scout-session-replay`    | Covered by native source (session_replay session_analysis_cluster) — intentional exclusion       |
| `signals-scout-surveys`           | No surveys in use                                                                                |
| `signals-scout-ai-observability`  | No LLM/AI events in project                                                                      |
| `signals-scout-revenue-analytics` | No PostHog revenue analytics configured (Paddle billing is tracked separately)                   |
| `signals-scout-feature-flags`     | No confirmed PostHog feature flag usage                                                          |
| `signals-scout-experiments`       | No A/B experiments running                                                                       |
| `signals-scout-logs`              | PostHog logs product not in use                                                                  |
| `signals-scout-csp-violations`    | No CSP reporting configured                                                                      |
| All others                        | Surface not in use or not ranked in the top 2–3 most-used products                               |

> To re-enable any disabled scout later, use `scout-config-update` in PostHog or ask Self-driving.

---

## Custom scouts

### Created: `signals-scout-gpp-prediction-funnel`

**What it watches:** Whether players who visit race pages (URLs matching `/races/`) are completing their top-5 driver picks and H2H teammate picks before sessions lock.

**Discriminator:** Submission rate relative to race-page visits — not raw event volume (which naturally spikes on race weekends), but the fraction of race-page sessions that end in at least one prediction submitted. A drop in this ratio while traffic holds signals a form regression or UX breakage.

**Why no built-in covers it:** `signals-scout-product-analytics` watches saved PostHog funnel insights, which don't exist yet on this project. A custom scout that knows the game's domain vocabulary (race pages, pick submission, session types, lock windows) provides targeted coverage from day one.

**Config id:** `019fa985-244f-7357-94da-56afa943fdcf`

**Noise escape hatch:** If this scout turns out noisy, set `emit: false` on its config in PostHog to switch it to dry-run mode — it will still run and write scratchpad memory but won't file inbox reports.

### Considered and ruled out

| Surface                                  | Filter that killed it                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Season pass checkout conversion (Paddle) | `signals-scout-revenue-analytics` is disabled; but more importantly, it's unclear which PostHog events exist for the Paddle checkout flow without deeper instrumentation investigation. Proposed, declined by user. |

### Declined proposals

- `signals-scout-gpp-season-pass-checkout` — proposed, declined by user.

---

## Follow-ups

- [ ] **Confirm products enabled** — The `products-enable` API requires `project:write` scope. Ask a project admin to verify Session Replay, Error Tracking, and Support (Conversations) are ON in [PostHog project settings](https://eu.posthog.com/project/134013/settings).
- [ ] **Connect a Support inbound channel** — Conversations is on but tickets only arrive once an email, inbox, or Slack channel is connected. Visit [PostHog integrations settings](https://eu.posthog.com/project/134013/settings/environment-integrations) to set one up.
- [ ] **Enable Google Search Console inbox responder** — The warehouse source is syncing. Once the `google_search_console` `search_opportunity` source_product is available in the API, enable it via `inbox-source-configs-create` or ask Self-driving to do it.
- [ ] **Instrument prediction events** (if not already done) — The custom `signals-scout-gpp-prediction-funnel` scout will close out quietly if no prediction-submission events exist. Confirm that events like prediction form views and top-5 / H2H submissions are being captured via `captureAnalyticsEvent` in `apps/web/src/lib/analytics.ts` and the Expo mobile app.
- [ ] **Build PostHog funnel insights** — `signals-scout-product-analytics` watches _saved_ PostHog funnels. Create at least one funnel insight (e.g. race page → prediction submit → score viewed) in PostHog so the scout has something to monitor.
- [ ] **Sentry EAS secrets** — Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` on EAS before the next prod mobile build so Sentry crash reports arrive with source-mapped frames (not minified).
- [ ] **Google / Bing Search Console verification** — Submit the sitemap at `https://grandprixpicks.com/sitemap.xml` to Google and Bing Search Console to unblock organic indexing. Now that the GSC warehouse source is connected, PostHog will surface search-opportunity findings once the data starts flowing.

---

## What happens next

The scout coordinator picks up the new configs within ~30 minutes and starts the first runs. Each scout draws one run from the project's daily budget (24 by default). Findings accumulate as reports in your [Self-driving inbox](https://eu.posthog.com/project/134013/inbox). Immediately-actionable reports come with suggested code fixes that Self-driving can open as tasks.

To request a higher daily run limit, email **team-self-driving@posthog.com**.
