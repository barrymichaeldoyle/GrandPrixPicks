# Grand Prix Picks Mobile MVP

Status: proposed  
Last reviewed: 2026-07-10

## Purpose

Ship a focused native client for the existing Grand Prix Picks product, **releasing to the iOS App Store first**. Android ships later from the same Expo codebase; nothing in this MVP may be iOS-only in implementation, but store readiness, device testing, and release gates target iOS. The MVP must let an authenticated user complete the core race-weekend loop:

1. Make Top 5 and Head-to-Head (H2H) picks for the next race weekend.
2. Return during the weekend and edit any session that has not locked.
3. Follow activity as sessions lock and results are published.
4. Compare weekend and season standings.

The web app and Convex backend remain the source of truth. Mobile must use the same Convex mutations and server-side validation; it must not reimplement lock authority locally.

This document defines product scope and behavior. `docs/mobile-api-contract.md` remains the lower-level API reference, but it requires the corrections listed under **Backend and contract work** before implementation. Implementation status and the remaining human-verification steps live in `docs/mobile-mvp-handoff.md`.

## MVP principles

- Picks are the primary action. The app should open on the relevant race weekend, not a generic dashboard.
- A session's server timestamp is authoritative. Device countdowns explain state but never grant permission.
- Initial picks should be fast: one Top 5 submission and one H2H submission seed all still-open sessions.
- Once picks exist, edits are session-specific so changing Race picks cannot alter an already settled Qualifying prediction.
- Locked picks remain readable and become social content; they are never silently hidden from their owner.
- The app should degrade cleanly when offline or when a lock occurs during submission.

## Scope

### Included

- Clerk sign-in, sign-up, sign-out, and session restoration. **Sign in with Apple must be offered** (App Review Guideline 4.8 requires it alongside other social logins; already implemented in `SignInScreen.tsx` — do not drop it).
- In-app account deletion (see More / settings). Required by App Review Guideline 5.1.1(v); a link to web account management does not satisfy it.
- Upcoming/current race-weekend home screen.
- Race schedule and per-session state for regular and sprint weekends.
- Create, view, and edit Top 5 picks.
- Create, view, and edit H2H picks.
- Mid-weekend entry after one or more sessions have locked.
- Draft preservation on the device.
- Personalized feed, including locked picks, published scores, streaks, and Revs.
- Full global and Following leaderboards for weekend and season, split by Combined, Top 5, and H2H.
- Lightweight player views needed by feed and leaderboard navigation.
- In-app notifications and native push notifications.
- Basic app settings and links to legal/support pages.
- A Leagues web handoff that opens league management on the web.

### Explicitly excluded

- Creating, joining, leaving, discovering, or managing leagues in the app.
- League detail, league feed, and league leaderboards.
- Full profile editing, prediction-history profile, and followers/following management.
- Billing and season-pass purchase. If a premium-gated surface is reachable in the app, show a neutral unavailable state — never "buy on the web" copy or a purchase link (App Store steering rules).
- Admin tools, randomize, social sharing, and web/PWA concerns.
- A full historical race browser. Historical race detail may be added after the core loop is stable.

### Reconciliation with the existing app

`apps/mobile/src/screens/` already contains screens beyond this scope: `PredictionHistoryScreen`, `FollowListScreen`, and full league screens (`LeagueListScreen`, `LeagueDetailScreen`, `LeagueSettingsScreen`). For anything listed as excluded above, MVP work includes **hiding or removing the existing screen and its navigation entry points**, not merely declining to build it. `PublicProfileScreen` may be kept only if trimmed to the lightweight player view described below. The delivery slices below describe the target state; several are already partially built.

## Information architecture

Use four native tabs, each with its own navigation stack:

| Tab         | Root                               | Key destinations                                                                      |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| Home        | Hero countdown + personalized feed | Feed-event detail, lightweight player view, notifications                             |
| Picks       | Current weekend                    | Top 5 editor, H2H editor, session result detail, notifications                        |
| Leaderboard | Rankings                           | Weekend/season filters, lightweight player view                                       |
| More        | Utility menu                       | Notifications, settings, leagues web handoff, support/legal, delete account, sign out |

Decision (2026-07-12): Home (next-race hero + feed) is the authenticated landing tab, with Picks second — the hero's countdown and Make Predictions CTA route into Picks, so the pick funnel stays one tap deep. The notification bell sits on the Home and Picks headers and pushes the inbox within the current tab's stack (never a cross-tab jump). Tab icons: home / flag / trophy / ellipsis. Notification and deep-link navigation may open a race session or feed event directly and must restore auth before resolving the destination.

## Core domain behavior

### Weekend sessions

- Regular weekend order: Qualifying, Race.
- Sprint weekend order: Sprint Qualifying, Sprint, Qualifying, Race.
- Every session has an independent lock time. Current fields are `sprintQualiLockAt`, `sprintLockAt`, `qualiLockAt`, and `predictionLockAt` for Race.
- Show all applicable sessions for the weekend, their local start time, and one of: `Open`, `Closing soon`, `Locked`, or `Results available`.
- “Closing soon” begins one hour before lock. A precise countdown is useful, but the UI must refresh its state when the app foregrounds and immediately before submission.

### Top 5 persistence

- A valid Top 5 contains exactly five unique drivers in rank order.
- First save omits `sessionType`. The backend writes the selection to every applicable session that is still open and skips locked sessions.
- Later edits send the selected `sessionType` and change only that session.
- If a targeted session locks before the mutation commits, keep the local draft, refresh server state, and explain that the saved picks were not changed.
- If all sessions are locked, the weekend is read-only.
- The backend only accepts picks for the next eligible race. A client-side race card is not authority.

### H2H persistence

- H2H is gated until at least one Top 5 prediction exists for the weekend.
- Each matchup accepts only one of the two drivers in that matchup.
- First H2H save seeds all still-open applicable sessions. This is enforced by the backend even if a client mistakenly supplies a session.
- Later edits are targeted to one open session.
- Locked sessions are skipped during a first/cascade save and rejected during a targeted edit.
- The matchup set is season-scoped and should be treated as server data, not hard-coded into the app.

### Mid-weekend entry matrix

| User state                                             | Selected session  | Required behavior                                                                                                   |
| ------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| No picks; all sessions open                            | Any               | Guided Top 5 then H2H flow; each first save applies across the weekend.                                             |
| No picks; earlier sessions locked; later sessions open | Next open session | Allow entry. Cascade only persists to still-open sessions and clearly says earlier sessions will not receive picks. |
| Existing picks; selected session open                  | Open session      | Show saved picks and an Edit action scoped to that session.                                                         |
| Existing picks; selected session locked, no result     | Locked session    | Read-only picks with a Locked state. Other open sessions remain editable.                                           |
| Result published                                       | Scored session    | Read-only predicted versus actual result, Top 5 points, and H2H score.                                              |
| Final session locked                                   | Weekend           | Entire weekend is read-only; direct users to Feed or Leaderboard.                                                   |

The app should default to the next open session. If none is open, default to the latest session in weekend order.

### Visibility and fairness

- Owners can always see their own saved picks.
- Another user's Top 5 and H2H picks must not be exposed before that session locks.
- At lock time, feed events may reveal picks even before results are published.
- The client must consume the backend's visibility response and must not infer visibility from cached data alone.

## Screen requirements

### 1. Authentication and boot

- Restore the Clerk session and initialize Convex with authenticated token fetching.
- Upsert/sync the user with device locale and IANA timezone after sign-in.
- Preserve the intended deep link through authentication.
- Signed-out users see a concise value proposition and sign-in/create-account actions. Browse-only public leaderboards are optional; making picks requires auth.
- Never flash authenticated picks to a signed-out state during session restoration.

### 2. Picks / current weekend

Header content:

- Grand Prix name, round, race date, and track timezone.
- Weekend progress, such as `1 of 4 sessions scored`.
- Session selector in true weekend order.
- Selected session start time, lock state, and countdown.

Body content:

- Top 5 card with saved/locked/scored state and Edit action when allowed.
- H2H card with saved/locked/scored state and Edit action when allowed.
- Predicted versus actual breakdown after results, plus session and weekend points.
- Empty state that starts the guided two-step flow.
- Explicit partial-weekend copy when earlier sessions are already locked.

Do not hide locked sessions. They establish continuity and explain why only later events are editable.

### 3. Top 5 editor

- Present as a full-screen stack route or native form sheet; use a full-screen route on compact devices.
- Five numbered slots with reorder, replace, and remove controls.
- Searchable or grouped driver list with team and driver identity.
- Save remains disabled until five unique drivers are selected.
- First-save subtitle: `Applies to every session still open this weekend.`
- Edit subtitle: `Applies to [Session] only.`
- Save automatically shortly after completion only if the interaction is unambiguous; always retain a visible Save state and error recovery.
- Persist an unsaved draft per race and edit scope. Warn before discarding it.
- After first Top 5 save, continue directly to H2H unless the user dismisses the flow.

### 4. H2H editor

- One row/card per teammate matchup with team and both drivers.
- Exactly one winner may be selected per matchup.
- Save is disabled until every displayed matchup has a selection.
- Use the same first-save versus session-edit scope language as Top 5.
- Preserve drafts and protect against accidental dismissal.
- If Top 5 does not exist, explain the dependency and navigate back to Top 5.

### 5. Feed

- Authenticated personalized feed contains the viewer and people they follow.
- Support cursor-based load more/infinite loading and pull to refresh.
- Group `session_locked` and `score_published` events by race and session.
- Render locked Top 5 picks, scored Top 5 breakdown, H2H summary, streak milestones, and Revs.
- Allow giving/removing a Rev and opening the users who Revved.
- Feed-event detail must support notification deep links.
- Empty feed recommends players from the global leaderboard. League-based recommendations may appear if already returned by the backend, but league management stays on web.
- `joined_league` events may be omitted from mobile MVP because their destination is not implemented.

### 6. Leaderboard

Expose the complete non-league matrix:

- Time: Race Weekend / Season.
- Mode: Combined / Top 5 / H2H.
- Scope: Global / Following (Following requires auth).
- Weekend race selector for any race eligible for leaderboard display.

Requirements:

- Show rank, player identity, points, and mode-specific detail (`Top 5 + H2H` split or H2H correct/total).
- Keep the viewer's rank visible when it falls outside the loaded page.
- Paginate season boards and preserve filter state when navigating back.
- Weekend boards may be empty before results. Default to Season unless a weekend is explicitly selected or has visible scores, matching web behavior.
- Use competition ranks consistently with the backend.

### 7. Notifications

- In-app inbox with unread badge, mark one read, and mark all read.
- Support results, amended results, session locked, and grouped Rev notifications.
- Push deep links:
  - reminder/lock soon -> relevant Picks session;
  - session locked -> read-only Picks session;
  - results/amendment -> scored session;
  - Rev -> feed event.
- Register one Expo push token per installation after permission is granted and remove it when push is disabled or the user signs out.
- iOS shows the system permission prompt only once. Do not request permission at launch: show an in-app pre-prompt explaining reminders and results notifications, triggered after the user's first successful pick save, and only then request the system permission. If the user declines the pre-prompt, leave the system prompt unspent and offer it again from settings.

### 8. More / settings

MVP settings:

- Push permission and device registration state.
- Toggles for prediction reminders, lock-soon reminders, results, session locked, and Revs.
- Email toggles for prediction reminders and results may remain available because they already exist server-side.
- Timezone: device default or explicit IANA timezone.
- ~~App appearance: system/light/dark.~~ Decision (2026-07-11): the app is dark-only, matching web (which hardcodes the dark theme). No appearance setting ships in the MVP; revisit only if web gains a light theme.
- Links to support, privacy, terms, and account management on web.
- Sign out.
- **Delete account** (in-app, required for App Store approval). Confirm destructively, then delete the Clerk user via the Clerk SDK (`user.delete()`); the existing Clerk webhook (`users.deleteUserFromClerkWebhook`) already cleans up Convex data. Sign the user out and return to the signed-out state on success.

### 9. Leagues web handoff

- Show `Leagues are managed on the web` — present-tense utility copy. Never use "coming soon" or placeholder framing: App Review rejects placeholder content under Guideline 2.1.
- Explain that existing leagues and league management are available on web.
- Primary action opens the authenticated web league page in the system browser.
- Preserve a return/deep-link path if practical, but do not embed the web app in a WebView.

## Offline and failure behavior

- Cache the latest race, driver roster, matchups, saved picks, feed page, and leaderboard page for read-only startup.
- Store drafts locally by race, game type, and scope (`cascade` or session).
- Do not queue prediction mutations for blind background replay. A queued save can cross a lock boundary and become misleading.
- When offline, editing may continue as a draft, but Save must state that a connection is required.
- On reconnect/foreground, refetch the race before enabling Save.
- On mutation failure, retain the draft and map known errors: race unavailable, not the next race, session locked, invalid/duplicate picks, Top 5 required, and unauthenticated.
- Optimistic Revs are acceptable with rollback. Picks should show a saving state and confirm from the mutation/subscription result.

## Existing backend/API mapping

| Capability           | Existing Convex API                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Current race         | `races.getNextRace`, `races.getQuickPickRace`, `races.getRace`, `races.getRaceBySlug`                                        |
| Weekend timing       | Race document lock/start fields, `races.getPredictionOpenAt`                                                                 |
| Driver roster        | `drivers.listDrivers`                                                                                                        |
| Top 5 read/write     | `predictions.myWeekendPredictions`, `predictions.submitPrediction`                                                           |
| Top 5 scores/results | `results.getMyScoresForRace`, `results.getEnrichedTop5BySession`, `results.getAllResultsForRace`, `results.getResultForRace` |
| H2H read/write       | `h2h.getMatchupsForSeason`, `h2h.myH2HPredictionsForRace`, `h2h.submitH2HPredictions`                                        |
| H2H results/scores   | `h2h.getH2HResultsForRace`, `h2h.getMyH2HScoreForRace`, `h2h.getMyH2HWeekendScore`                                           |
| Feed                 | `feed.getPersonalizedFeed`, `feed.getFeedEvent`, `feed.giveRev`, `feed.removeRev`, `feed.getRevUsers`                        |
| Leaderboards         | Combined, Top 5, and H2H season/following/race queries in `leaderboards.ts` and `h2h.ts`                                     |
| In-app inbox         | `inAppNotifications.getMyNotifications`, `markRead`, `markAllRead`                                                           |
| Native push          | `push.saveExpoPushToken`, `push.deleteExpoPushToken`                                                                         |
| Preferences          | `users.me`, `users.syncProfile`, `users.updateNotificationSettings`, `users.updateRegionalSettings`                          |

## Backend and contract work before mobile implementation

1. ~~Add one mobile-oriented `getCurrentWeekend` query.~~ Done: `races.getCurrentWeekend` returns the quick-pick race (in-progress locked race, else next submittable) plus `isSubmittable` and `serverNow`; the mobile picks screen consumes it.
2. ~~Return a server-derived capability model per session.~~ Done: each session carries `lockAt`, `isLocked`, `hasResult`, `hasTop5`, `hasH2H`, `canCreate`, `canEdit`, and `denialReason` (`sign_in` / `session_locked` / `race_not_submittable`), derived in `lib/weekendCapabilities.ts` (unit-tested, including mid-weekend sprint entry). Mutations remain final authority; the device clock only advances lock display between query refreshes.
3. ~~Confirm the race-status transition policy.~~ Confirmed: races flip `upcoming → finished` only when the race-session result publishes (`results.ts`); nothing sets `locked` mid-weekend except the manual `emergencySetRaceStatus`. Mid-weekend targeted edits therefore stay eligible until each session's own lock, and next-race picks open the moment the current race's final lock passes.
4. ~~Add a stable mobile deep-link payload to every push type.~~ Done: every push carries `data.url` with a site path — the same contract web push uses. The stable path grammar is `/races/{slug}`, `/feed/{feedEventId}`, and `/feed`; mobile routes exactly these shapes and ignores anything else. If a push ever needs a destination outside that grammar, extend the payload rather than the parser.
5. ~~Wire Expo push delivery.~~ Done: `sendExpoPushBatch` delivers to Expo tokens alongside web push for all five preference categories, pruning `DeviceNotRegistered` tokens. Still required: end-to-end delivery and deep-link tests on a physical device via TestFlight.
6. Correct `docs/mobile-api-contract.md`: notification field names are stale, privacy API references do not match current exports, feed/in-app notification APIs are absent, and the full Combined/Top 5/H2H leaderboard matrix is incomplete.
7. Decide whether a lightweight player summary needs a dedicated query. Reusing full web profile-history queries is unnecessary for MVP navigation.
8. Add contract tests for a first submission made after earlier sessions lock, for both Top 5 and H2H, including regular and sprint weekends.

## Analytics

Tooling: PostHog via `posthog-react-native` (same project and EU host as
web's `posthog-js`). Events share web's snake_case naming (overlapping
events like `feed_event_reved` reuse web's exact names), users are
identified by Clerk user id as on web, and capture is manual-only —
no autocapture or lifecycle events. Enabled only in production builds
with `EXPO_PUBLIC_POSTHOG_KEY` set (configure it in EAS). Note: web
gates capture behind cookie-consent opt-in; mobile currently captures
by default in production — revisit if EU consent parity is wanted.

At minimum capture:

- auth started/completed/failed;
- Top 5 editor opened, completed, saved, and failed;
- H2H editor opened, completed, saved, and failed;
- save scope (`cascade` or session) and number of open/locked sessions;
- session lock encountered during save;
- feed loaded, paginated, event opened, Rev added/removed;
- leaderboard filter changed and player opened;
- notification permission result, notification opened, and push setting changed;
- leagues web handoff opened.

Never include driver picks or private user content in analytics payloads.

## MVP acceptance criteria

- A new user can sign up, make five ordered Top 5 picks, complete every H2H matchup, and verify that both apply to every open session.
- On both regular and sprint weekends, a user can edit one open session without changing another session.
- A user joining after an earlier session locks can still save picks for every remaining open session.
- A session locking between editor open and Save cannot overwrite server data; the draft remains recoverable and the UI becomes read-only.
- Owners can view their picks at all times; other users' picks are unavailable until the corresponding lock.
- Published results update the race screen, feed, notification inbox, and weekend leaderboard without an app release.
- Feed pagination, Revs, and empty-state discovery work for an account with no follows and an account with follows.
- Every global/following, weekend/season, Combined/Top 5/H2H leaderboard combination renders the correct empty, signed-out, loading, error, and populated state.
- Push permission, token registration, preference toggles, receipt, and deep-link routing are tested on a physical iOS device. (Repeat on Android before the later Android release; not an iOS MVP gate.)
- A user can delete their account from the app; the Clerk user and Convex data are removed and the app returns to the signed-out state.
- League actions are not exposed natively; the web handoff opens the correct web page.

## iOS release readiness

Because iOS ships first, the following are MVP release gates (Android equivalents are deferred to the Android release):

- **Sign in with Apple** offered alongside other Clerk social logins (Guideline 4.8).
- **In-app account deletion** working end to end (Guideline 5.1.1(v)).
- **No placeholder content** — the leagues surface uses the web-handoff framing above (Guideline 2.1).
- **No purchase steering** — no season-pass pricing, purchase links, or "buy on web" copy anywhere in the app.
- **App Privacy nutrition labels** completed in App Store Connect. The analytics section below commits to collecting event data; declare it accurately. If analytics is first-party and not used for cross-app tracking, App Tracking Transparency is not required — keep it that way.
- **APNs push credentials** configured via EAS; push receipt and deep links verified on a physical device via TestFlight.
- **Sentry symbolication** — set `SENTRY_AUTH_TOKEN` / org / project secrets on EAS before the first TestFlight build so crash reports arrive with readable frames.
- **TestFlight** distribution for at least one full race weekend before App Store submission.

Deferred to the Android release: FCM configuration, Play Console setup and data-safety form, Android physical-device matrix, and Play store listing.

## Recommended delivery slices

Slices 1–5 are partially built in `apps/mobile` today; treat each slice as "finish and verify against this document", including removing out-of-scope screens per the reconciliation section.

1. Foundation: auth (including Sign in with Apple), Convex provider, navigation, theme, deep-link shell, current-weekend query.
2. Picks: session state, Top 5, H2H, drafts, lock races, result display.
3. Leaderboard: all non-league dimensions, pagination, lightweight player view.
4. Feed: pagination, grouped session events, event detail, Revs.
5. Notifications and settings: inbox, Expo push (with the pre-prompt flow), preferences, web handoffs, account deletion.
6. Hardening and iOS release: offline reads, foreground refresh, analytics, accessibility, iOS device matrix, the iOS release-readiness checklist above, TestFlight.
7. Android follow-up (post-MVP): FCM, Play readiness, Android device matrix.
