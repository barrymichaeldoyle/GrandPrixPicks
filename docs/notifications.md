# Notifications

The backend selects recipients and creates durable delivery records. Mobile and web share the same preferences. Publishing a news item never sends a push automatically.

## Delivery policy

| Event                                       | Push                                                          | Email                                                                 |
| ------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| Missing picks, 24h before the first session | One weekend reminder                                          | Alternative channel; explicit email choices are preserved             |
| Missing picks, 2h before a session          | Only users missing Top 5 or active H2H picks for that session | None                                                                  |
| Complete picks                              | No action reminder                                            | None                                                                  |
| Signup with no Top 5 picks, after 1h        | Eligible push channel                                         | Eligible email channel; skip when a weekend reminder is within 25h    |
| Session results                             | Session participants, including H2H-only players              | No per-session email                                                  |
| Weekend summary                             | Covered by session results                                    | One participant summary after race scoring, with Top 5 and H2H totals |
| Session locked                              | Separately selectable; off by default                         | None                                                                  |
| Selected news                               | Explicit opt-in, one selected story per user per 24h          | None                                                                  |
| Official score amendments                   | Existing in-app notice                                        | Included in the totals if the summary has not sent yet                |

Selected news respects quiet hours (22:00–08:00 in the user's saved timezone, UTC if unavailable). Users can turn quiet hours off. Deadline reminders and results are not delayed by this setting. Mobile foreground pushes do not play sounds or show banners; the notification list remains available.

`preferPushReminders` exposes automatic channel selection. With no explicit email preference, it defaults on. Explicit legacy/current email choices default it off, preserving deliberate “both” settings. Email and push opt-outs always apply. Email suppression from a complaint/bounce is independent of these preferences. A native token refreshed within 30 days or a registered browser subscription counts as an available push channel; this is availability evidence, not delivery proof. There is no automatic email fallback merely because a push was unopened.

## Delivery records and cancellation

`notificationDeliveries` records the user, device, event, category, expiry and status:

- `queued`: awaiting its scheduled time or quiet-hours window.
- `sending`: claimed by the dispatcher, with a recovery lease.
- `accepted`: Expo returned a ticket ID.
- `handed_off`: Expo receipt or web-push response confirms provider acceptance. This does not prove the device displayed it.
- `failed`: a permanent error or exhausted retry budget.
- `cancelled`: opted out, expired, cancelled campaign, removed device, changed owner or obsolete deadline.

Network/429/5xx failures use bounded backoff, up to five attempts. An ambiguous network timeout can still result in duplicate provider delivery; push is not exactly-once. Expo receipts are checked after 15 minutes and missing receipts eventually fail. Invalid tokens are pruned only if still owned by the delivery's user. `openedAt` records authenticated taps. Event/device keys deduplicate enqueueing; event cancellation is checked again immediately before transport.

The dispatcher uses the Convex rate-limiter component. Email uses the Resend component's durable queue and application idempotency keys. `notificationEmails` describes enqueue eligibility; provider delivery status lives in Resend. Preferences and missing picks are checked again before handing email to the component. Once a provider has accepted a message, it cannot reliably be recalled.

The emergency stop `notifications:cancelQueuedResultNotifications` cancels result and summary campaigns, including already expanded push work. It does not recall accepted messages. `newsNotifications:cancel` cancels a selected story. `notifications:inspectRecentNotificationJobs` returns a bounded, categorized sample of the latest 1,000 push delivery records; it is not an exact all-time metric.

Account deletion removes every Expo token, browser subscription and app delivery record for the user. Normal mobile sign-out tries to unregister before ending the session; offline cleanup remains best-effort. Account switching rebinds the token and invalidates queued work belonging to its former owner.

## Editorial news workflow

Select only a story that deserves an interruption. Use a stable `storyKey` across multiple articles about the same development. Routine reports, commentary and previews stay in the feed. Do not put result spoilers in news pushes. Schedule/deadline changes belong in the affected players' reminder flow rather than a general news alert.

The authoring interface follows the existing `raceNews:publish` CLI workflow. Preview:

```sh
convex run newsNotifications:select '{"raceSlug":"madrid-2026","key":"driver-change","storyKey":"madrid-driver-change","spoilerFree":true}'
```

The result shows the exact headline and feed destination without queuing a campaign. After editorial review, repeat with `"preview":false` to select the story for delivery. `spoilerFree:true` is the editor's assertion, not automatic content classification. The item must be active, out of embargo and present in the feed. The push opens that exact feed item on web and mobile. News does not create an additional inbox row.

Cancel a queued selection:

```sh
convex run newsNotifications:cancel '{"storyKey":"madrid-driver-change"}'
```

These commands use whichever deployment is selected; identify that deployment before running them. No news was selected or sent as part of implementing this feature.

## Rollout

The new transports start paused: `NOTIFICATION_DELIVERY_ENABLED` must equal `true` to dispatch push or enqueue optional email into Resend. This permits schema/code verification without sending messages from a development or copied database. It is also a global stop for work not yet accepted by a provider. The dispatcher resumes eligible queued email and push when enabled; expired pushes are cancelled.

1. Deploy the backend to development and verify the installed mobile builds against that deployment.
2. Configure provider settings for the intended deployment: VAPID keys, Expo/APNs/FCM credentials, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, and `RESEND_WEBHOOK_SECRET`. Convex supplies `CONVEX_SITE_URL`; it must be present to construct unsubscribe links. Keep `RESEND_TEST_MODE` enabled in development. Optional `EXPO_ACCESS_TOKEN` must match the project's Expo enhanced push security setting if enabled.
3. Register the Resend webhook at `https://<deployment>.convex.site/resend-webhook`. Include delivery, bounce and complaint events. Verify SPF, DKIM and DMARC on the sending domain. These external provider settings are not established by a code deployment.
4. After the production deployment, run `notifications:rescheduleUpcomingRaceReminders` once on that target. It replaces stored reminder schedules and creates future per-session 2h jobs independently of the 24h window. Runtime legacy preference resolution preserves opt-outs without a destructive migration.
5. Review pending campaigns and the current delivery roster before setting `NOTIFICATION_DELIVERY_ENABLED=true`. Set `RESEND_TEST_MODE=false` only on the intended live email deployment.
6. Verify one controlled delivery through ticket, receipt, tap and exact destination. Exercise unsubscribe without login and a signed provider webhook.

Old raw push/email batch entry points remain callable only to drain scheduled work safely: they report zero sent and skip legacy payloads lacking owner/expiry information. Consequently, old raw batches pending at rollout are not replayed. Already enqueued Resend component jobs are separate and may still deliver; inspect/cancel those using provider/component tooling before a cutover if needed.

Production deployment, provider configuration, live test messages and app-store builds require their normal release workflow. This document is not evidence that those operational checks have occurred.

## Release validation

Automated coverage includes recipient paging, partial picks, participant-only results, legacy opt-outs, explicit channel choices, token reassignment, opt-out after enqueue, Expo tickets/receipts/failures, rescheduling, quiet-hours calculations, editorial selection, story/daily limits, email unsubscribe and Resend enqueueing. Mobile tests cover Android channel-before-permission ordering and notification routing.

Installed-device checks still matter: first install, allow/deny, changing OS permission while backgrounded, same-account re-login, A→B switching, offline registration/sign-out, foreground/background/terminated delivery, and old weekend-result taps. The native badge is refreshed from the in-app unread count when connected; provider acceptance is not a guarantee of badge or banner presentation.

## Implementation verification — 10 September 2026

The final backend compiled and deployed successfully to personal development
`fine-greyhound-738`. Production was not deployed and notification delivery
was not activated. Backend tests: 469 passed, one skipped. Mobile tests:
38 passed. Backend/mobile TypeScript, notification-file lint/format checks,
and backend query-hygiene checks passed.

The full web TypeScript check reported two errors in the concurrently edited
`apps/web/src/routes/seo-head.test.tsx` (possibly undefined description content,
lines 231 and 292 at verification time). Those unrelated edits were preserved.
No installed-device push, live email, provider credential, or DNS verification
was performed in this implementation run.
