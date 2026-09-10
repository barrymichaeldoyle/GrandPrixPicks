# Notification audit — 10 September 2026

This records the pre-change audit. See [Notifications](notifications.md) for the implemented policy and rollout instructions.

Verdict: useful foundations, but the current notification system needs reliability fixes and a deliberate channel policy before mobile release. Enabling push currently adds another delivery channel without reducing email. Push should handle timely, actionable updates; email should provide an explicitly chosen reminder or useful summary.

Scope: local backend, mobile and web implementation, installed Resend component, existing tests, and current Expo/Gmail guidance. This is a code audit, not proof of production delivery. No production notifications were sent or settings changed. Production credentials, delivery metrics, DNS authentication, installed-build behavior and existing user preference data remain unverified.

## Current behavior

All seven email/push category preferences default to enabled when absent. Push still requires a registered device. Both clients expose separate category switches; there is no automatic channel selection, quiet-hours policy or overall frequency budget.

| Event | Email | Push | In-app |
| --- | --- | --- | --- |
| No Top 5 predictions one hour after account creation | Yes, reminder preference | Yes, if registered and enabled | No corresponding reminder record |
| 24h before first session lock, no Top 5 picks for weekend | Yes | Yes | No corresponding reminder record |
| 24h before first lock, any Top 5 pick exists | No | Lock-approaching category | No corresponding reminder record |
| 2h before first lock, no Top 5 picks | No | Yes | No corresponding reminder record |
| 15 minutes after completing all Top 5 sessions, H2H incomplete | Yes | Yes | No corresponding reminder record |
| Admin-triggered H2H reminder | Yes | No | No |
| Session locks | No | Users with Top 5 picks in session | Yes |
| Session scoring completes | Per-session email; includes some nonparticipants | Every enabled subscriber, regardless of participation | Participant score notifications |
| Official results amended | No separate amendment email | No separate amendment push | Yes |
| Reaction received | No | Per reaction | Yes, displayed in groups |
| Announcement | No in reviewed broadcaster | No in reviewed broadcaster | Yes |

Sources: `apps/backend/convex/notifications.ts`, `push.ts`, `inAppNotifications.ts`, `results.ts`, `predictions.ts`, `lib/auth.ts`, `lib/notificationChannels.ts`.

A fully participating sprint-weekend user with all defaults enabled can receive **nine pushes plus four emails**, before reactions: one lock-approaching push, four session-lock pushes, four result pushes and four result emails. Multiple devices and a web subscription multiply the push deliveries. This is derived from the code, not measured production volume.

## Release priorities

### 1. High — device ownership and registration lifecycle

`apps/backend/convex/push.ts:247` only inserts an Expo token if it does not already exist. It never transfers an existing token to the currently authenticated account. The web subscription upsert similarly updates keys without updating its owner.

`apps/mobile/src/hooks/useSignOutWithCleanup.ts:20` attempts deletion but signs out even if cleanup fails. Account B can therefore register a token still owned by A; A's notifications continue targeting that device, while B's do not.

`apps/mobile/src/providers/NotificationsProvider.tsx:65` caches a token before server registration succeeds, never clears that ref at sign-out, and keys registration to `isSignedIn`, not account identity. Successful cleanup followed by sign-in in the same provider lifetime can leave the token deleted and skip re-registration. Failed registration also has no active retry. Permission checks on app activation update Settings but do not reconnect registration; granting permission in OS Settings can require an app restart to register.

Fix: explicitly bind an installation to the current authenticated user, refresh on identity/permission changes and token rotation, mark registration successful only after persistence, and retry transient failures. Test same-account re-login, A→B switching, failed cleanup, OS-settings enablement and token rotation.

### 2. High — push acceptance is treated as delivery, and failures disappear

`apps/backend/convex/pushNotifications.ts:84` discards Expo ticket IDs and never requests receipts. Only immediate ticket errors trigger stale-token removal. HTTP failures return normally, with no retry; missing/short ticket arrays can still count unsatisfied sends as successful. There is no project-wide rate limiter or transient-error backoff.

The web sender catches individual send failures without rethrowing or recording an explicit failed result. Its `Promise.allSettled` calculation therefore usually counts failed sends as successful too (`pushNotifications.ts:48`).

Fix: persist event/recipient/channel/attempt status and ticket IDs; distinguish queued, accepted, provider handoff and opened; validate response shape; retrieve receipts and prune invalid tokens; back off on transient errors and alert on invalid credentials. A successful receipt is still not proof that a person saw the message. Expo recommends checking receipts after about 15 minutes and limits requests to 100 messages and project throughput to 600 notifications/second. [Expo delivery guidance](https://docs.expo.dev/push-notifications/sending-notifications/).

Email has stronger infrastructure: installed `@convex-dev/resend` 0.2.8 provides a durable queue, retries, batching and idempotency for its queued work. Do not replace that with another hand-built transport. Application event deduplication is still needed across separate enqueue calls.

### 3. High for Android — permission request precedes channel creation

`apps/mobile/src/lib/pushRegistration.ts:26` requests permission and returns on denial before creating the Android channel. Settings also requests permission before calling registration. On a fresh Android 13+ install, this can prevent the expected permission flow. Create channels first in a shared registration path. Expo explicitly documents that the prompt requires a notification channel. [Expo permissions](https://docs.expo.dev/versions/latest/sdk/notifications/#permissions).

The app uses one MAX-importance channel and all messages request sound. Separate deadline reminders from social activity and use normal importance for nonurgent categories. Test on an installed Android release build; the code finding is not a device reproduction.

### 4. High — schedule changes can duplicate or omit reminders

`apps/backend/convex/notifications.ts:954` tracks/cancels only the email reminder job. Repeated scheduling adds new 24h/2h push jobs without cancelling old ones. Its early return when the 24h time is past also prevents creating a still-valid 2h reminder. Old jobs carry only a race ID, not the schedule version or expected lock time.

The reminder audience checks race status rather than the particular session's current deadline, and transport payloads specify no expiry. Delayed delivery can make “2 hours” or “24 hours” false. Expo documents a provider default TTL of four weeks when omitted. [Expo payload format](https://docs.expo.dev/push-notifications/sending-notifications/#message-request-format).

Fix: store/cancel each job or validate a schedule version; evaluate each reminder's scheduling window independently; add unique event/recipient/channel keys; re-check deadlines at dispatch; set expiry at the relevant lock. Session-lock schedules also need stale-time validation when a session is moved.

### 5. High — preserve legacy opt-outs and delete all device records

`apps/backend/convex/schema.ts:57` retains `emailReminders`, `pushReminders`, `predictionReminderChannel` and `resultsNotificationChannel`. The current channel helpers ignore these and default missing new fields to true. No migration using those fields was found in the reviewed backend. **If legacy-only preference records remain**, an old opt-out can become an opt-in. Verify production counts before claiming this affects users; migrate or interpret old settings conservatively.

`apps/backend/convex/users.ts:247` deletes web subscriptions during account deletion but contains no Expo-token cleanup. Mobile deletion only attempts to remove its own local token, leaving other installations. Delete every token by user on the server. Orphan tokens are a retention/ownership problem; the current user-based fan-out does not by itself imply continuing sends to a deleted user.

## Channel and experience findings

### 6. Email and push duplicate events by default

The 24h reminder, signup nudge, H2H nudge and results independently enqueue both channels. `results.ts:1676` schedules email and push at the same delay. `notifications.ts:552` can send email and push only 15 minutes after a user completes Top 5 picks.

Separate switches are a good foundation, but permission to send push does not itself establish that users want duplicate emails. Choose an explicit default delivery policy; preserve deliberate “both” selections and existing opt-outs. Avoid falling back to email merely because a push wasn't opened: neither unread nor provider acceptance proves nondelivery.

### 7. Reminder eligibility misses incomplete weekends

`push.ts:177` treats any Top 5 prediction for the weekend as participation. The 2h reminder excludes that user even if race/sprint picks remain missing. The H2H completion nudge only applies after all Top 5 sessions are present. Users with partial Top 5 and partial H2H can therefore miss useful reminders.

Evaluate missing picks against the sessions still open, then combine Top 5/H2H into one relevant reminder. The scheduled 24h email currently calls its deadline “picks close” even though it refers to the first session, so later session opportunities need clearer semantics.

### 8. Settings promise different behavior from the implementation

`apps/mobile/src/screens/SettingsScreen.tsx:46` describes lock reminders as one hour before a session; actual lock-approaching push is 24h before the first session, for users with any pick. Email reminders are described as weekend opening and closing emails; the automatic weekend reminder is at 24h, with signup/H2H nudges sharing the same switch. Email results say “after each race” but send per scored session.

`apps/web/src/routes/settings/-components/NotificationsSection.tsx` likewise describes reminder emails without disclosing signup/H2H nudges. Align labels/help with the chosen policy, following `docs/product-voice.md` when changing copy.

### 9. Results and reactions can be unnecessarily noisy

`push.ts:451` sends “See how you scored” to every push-enabled user, including nonparticipants. `notifications.ts:434` intentionally builds a post-race missed-picks email for users without a score. Treat reactivation as a separate decision from personal result delivery.

Reactions are grouped in the inbox but each reaction can create a push. The foreground handler always allows banners and sound, even while the person is using the relevant screen. No overall cooldown or quiet-hours policy was found. Use participant-only results, group reactions over a short interval, and suppress redundant foreground alerts. Consider session-lock notifications an optional social feature rather than a default interruption for every session.

### 10. Email unsubscribe and feedback need completion

Email templates link to authenticated settings. No app-level signed unsubscribe endpoint, `List-Unsubscribe` headers, or Resend delivery/bounce/complaint webhook handler was found. A preference-center link is useful but is not one-click unsubscribe.

Add unauthenticated, signed unsubscribe controls for optional email categories and authenticated provider feedback handling; use provider suppression where available and reflect it in channel eligibility. Gmail recommends easy unsubscription and requires one-click unsubscribe for relevant marketing/subscription traffic from bulk senders; applicability depends on actual sending volume and message classification. [Gmail sender guidance](https://support.google.com/mail/answer/81126?hl=en), [subscription guidance](https://support.google.com/mail/answer/15263077?hl=en).

Verify SPF/DKIM/DMARC and Resend production/test-mode configuration separately. This audit did not inspect production DNS or provider configuration.

### 11. Mobile taps can lose context

`apps/mobile/src/lib/pushRouting.ts:65` drops the result URL's `raceId` and time scope. A previously selected leaderboard or an older notification can show the wrong weekend. Session-lock pushes use `/` to offer everyone's picks, but mobile maps that to Picks rather than the home feed.

The provider reads the last response on mount but never clears it; its in-memory deduplication cannot prevent a previous tap being handled again after process restart. Carry typed destination/event IDs, preserve weekend/session context, and clear consumed responses. Add notification IDs to correlate delivery/open events and define when tapping marks an inbox entry read.

### 12. Scale and emergency-stop gaps

Push roster fan-out is paginated, which is good. Email batches paginate users but rebuild whole-race prediction/score sets and season standings each time (`notifications.ts:238`, `:382`); these reads can still exceed a transaction budget as participation grows.

`notifications.ts:1082` cancels named result fan-out/email jobs but does not match already queued generic `pushNotifications:sendPushBatch` or `sendExpoPushBatch` jobs. It cannot reliably stop the remainder of an already expanded push campaign. Carry event IDs into transport jobs and check an event-level cancellation flag immediately before sending. The global `notificationsSent` result flag marks scheduling, not successful delivery; retain event-level deduplication while allowing failed recipients to retry.

## Recommended delivery policy

These are product recommendations, not platform requirements.

| Event | Push | Email |
| --- | --- | --- |
| Missing picks, 24h before first relevant deadline | Preferred for users choosing mobile reminders | Alternative for email-preferring users; both only by choice |
| Missing picks, close to lock | One actionable reminder for still-open sessions | No extra last-minute email by default |
| All picks complete | No action reminder | None |
| H2H incomplete | Combine with missing-picks reminder; inline prompt while active | Same reminder policy; avoid automatic double-channel 15-minute nudge |
| Results | Short update to session participants | One useful weekend summary, separately selectable |
| Session locked | Optional; inbox by default | None |
| Reactions | Grouped, with cooldown; optionally silent | None |
| Signup inactivity | One eligible channel, avoiding nearby weekend reminders | Only under the chosen reminder/engagement preference |
| Material score correction | Notify affected participants when warranted | Include in summary; exceptional standalone email only when useful |

Model eligibility and delivery separately: event → relevant user → allowed channel(s) → unique delivery record → transport → receipts. Honor explicit preferences first. Track current registration health rather than treating a token's existence as permanent availability. Keep historical inbox content independently of push permission.

## What is already good

- Permission is offered after a meaningful first save, rather than automatically at launch.
- Both clients expose individual push/email categories backed by the same user preferences.
- Push registration/deletion uses authenticated identity; web endpoints have a provider-host allowlist.
- Main push fan-outs paginate users and batch Expo messages in groups of 100.
- Immediate stale-token errors and expired web subscriptions are pruned.
- Result scheduling has a deduplication flag; H2H completion nudges have a queued marker; session-lock inbox creation deduplicates recipients.
- In-app history is durable, paginated and independent of OS push permission; cold-start routes are buffered until navigation is ready.
- Resend provides durable email delivery infrastructure.

## Validation and remaining release gate

Existing test execution passed: backend **457 passed, 1 skipped**, mobile **33 passed**. The package scripts ran the complete suites despite supplied filename arguments. This includes fan-out/eligibility and push-routing coverage. These tests do not prove receipt handling, token lifecycle, Android permission behavior or production delivery.

Before release, add regression coverage for priorities 1–5 and verify on installed builds: permission allow/deny/settings change; same-account re-login and account switching; offline registration and cleanup; foreground/background/terminated delivery and taps; old result taps; correct badge behavior; transient provider failure, invalid token and receipt processing; opt-out between scheduling and dispatch; moved/cancelled sessions; and email unsubscribe without login.

Read-only operational follow-up should measure legacy-only preferences, device counts/ownership, actual email volume and suppression, Expo receipt failures, scheduled campaign duplication, and credentials/domain readiness. Establish send/accept/fail/open metrics by event and channel before using click rates to tune frequency.
