# App Store listing

Draft copy for App Store Connect. iOS only for now.

The same listing fields are encoded in `store.config.json` and validated with
`eas metadata:lint`. Push them after the first binary reaches App Store Connect:

```sh
eas metadata:push --profile production
```

The machine-validated version lives in `store.config.json`. After the first
binary is uploaded, run `eas metadata:push` from this directory to sync it to
App Store Connect.

Character limits are Apple's and are hard: the name and subtitle truncate in
search results, so both are written to survive that rather than to fit exactly.

## Metadata

| Field              | Value                                                   | Limit        |
| ------------------ | ------------------------------------------------------- | ------------ |
| App Name           | `Grand Prix Picks`                                      | 30 (16 used) |
| Subtitle           | `Predict every F1 weekend`                              | 30 (24 used) |
| Primary category   | Sports                                                  |              |
| Secondary category | Entertainment                                           |              |
| Copyright          | `2026 Barry Michael Doyle Software Solutions (Pty) Ltd` |              |
| Support URL        | `https://grandprixpicks.com/support`                    | verified 200 |
| Marketing URL      | `https://grandprixpicks.com`                            |              |
| Privacy Policy URL | `https://grandprixpicks.com/privacy`                    | verified 200 |

Launch pricing is free, with no ads or in-app subscription in version 1.0.0.
App Store Connect was configured and verified on 2026-10-15: free in all 175
territories, with new territories enabled automatically. Build 14 is selected
for version 1.0.0; the draft remains unsubmitted with manual release selected.
A possible later release may add ads and a monthly in-app subscription to
remove them, separate from web subscriptions. That later plan is not part of
the launch listing or its current advertising/privacy declarations.

### Keywords (100 characters)

```
f1,formula 1,racing,motorsport,prediction,predictor,fantasy,qualifying,sprint,pickem,tipping,game
```

97 characters. Deliberately excludes "grand", "prix" and "picks": the app name
is already indexed, and repeating it wastes the field. "league" is omitted
because private leagues are managed on the website, not in the app. Comma
separated with no spaces, because spaces count.

### Promotional text (170 characters)

Editable without review, so use it for the current round.

```
Get your Top 5 in before qualifying locks, pick the winner of each team-mate duel, and see where you rank after every session.
```

## Description

```
Grand Prix Picks is a free prediction game for every Formula 1 weekend. Pick the top five for qualifying, the sprint and the race, and see how you rank against everyone else.

How it works

Rank the top five for each session. Then call every team-mate duel: which of the two drivers in each team finishes ahead.

Five points for a driver in exactly the right position. Three for one place out. One for a driver who finished in the top five but further from your pick. A perfect session is 25 points.

Each session locks at its own start time. A sprint weekend gives you four sessions to score in, and a bad Saturday doesn't cost you Sunday.

Play with others

Climb the season and weekend leaderboards. Follow other players and see their picks once a session locks. Private leagues are on grandprixpicks.com.

Scored on the official result

Scores use the official FIA classification. If the stewards apply a penalty after the flag, your score changes with it.

Free to play

No wagering, no entry fees, no prizes.

Grand Prix Picks is unofficial and is not associated in any way with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1 and related marks are trade marks of Formula One Licensing B.V.
```

## What's New (version 1.0.0)

```
First release. Pick your Top 5 for every qualifying, sprint and race, call each team-mate duel, and track your season on the leaderboard.
```

## App Review Information

**Supply a demo account anyway.** The app no longer opens on a sign-in
screen: home, picks, leaderboard and the feed are all browsable signed out, so
a reviewer can reach the product without an account. Settings and notifications
still gate, and only a signed-in account shows submitted picks, a personal
standing and the notification bell. Create a real account with picks against
the current round, put the credentials in App Review Information, and the
reviewer sees a populated app rather than empty states.

The current, ready-to-paste notes are in `APP_REVIEW_NOTES.txt`. Review
contact details and these notes were saved to App Store Connect on
2026-10-15. The dedicated production review account's supplied credentials
were also saved in App Store Connect. Keep credentials there or in a password
manager, rather than this repository. Its populated picks and fresh-device
sign-in still need verification.

Notes worth adding for the reviewer:

```
Grand Prix Picks is a free prediction game for Formula 1. There is no
wagering, no purchase of entries, and no prizes: users predict finishing
orders and are scored on accuracy.

Sign in with Apple is supported. Accounts can be deleted from
Settings > Delete account, which removes the account and its data.

Private leagues are managed on grandprixpicks.com; there is no league
screen in the app.
```

## Age rating

**Declared 2026-09-09: 4+** (172 countries; Brazil A6, Korea ALL, Vietnam 00+).
There is no gambling: nothing is staked, bought or won.

"Contests" is answered **Infrequent**, not None. Apple's current wording is
"events that allow users to compete with one another for rankings, rewards, or
the achievement of personal goals", which the leaderboard meets even with no
prize, so None would contradict the definition on screen. Frequent computes to
**13+**; Infrequent computes to **4+**, which is why the answer is Infrequent
and `store.config.json` carries `"contests": "INFREQUENT_OR_MILD"`.

Two other questionnaire answers are not in `store.config.json` because the
schema has no field for them: **Social Media = No** (the feed carries
app-generated events, with no user-authored text) and **Social
Media Disabled for Users Under 13 = No** (nothing to disable, and the app does
not call the Declared Age Range API). The Afghanistan and Morocco sales
restriction is unrelated to these answers: it shows on every combination.

## Privacy nutrition labels

Declare what is actually collected. The app's privacy manifest
(`ios.privacyManifests` in `app.json`) declares only the required-reason APIs;
its `NSPrivacyCollectedDataTypes` is empty, so these five types are declared in
App Store Connect alone:

**Declared and published 2026-09-09.** Apple has no "diagnostics" purpose, so
crash and performance data are filed under App Functionality. Nothing is used
for tracking, so the app needs no ATT prompt.

| Data (ASC data type)          | Apple purpose     | Linked | Tracking |
| ----------------------------- | ----------------- | ------ | -------- |
| Email Address (Clerk)         | App Functionality | Yes    | No       |
| Other User Content (picks)    | App Functionality | Yes    | No       |
| Product Interaction (PostHog) | Analytics         | Yes    | No       |
| Crash Data (Sentry)           | App Functionality | Yes    | No       |
| Performance Data (Sentry)     | App Functionality | Yes    | No       |

## Screenshots

As checked on 2026-10-15, Apple's required iPhone set is **Dynamic Island
medium display** (1206 × 2622 or 1179 × 2556). Capture on an iPhone 17 Pro
simulator for 1206 × 2622. The existing 1320 × 2868 images cover the large
display and can be used as an additional set. Do not assume the old
large-display-only checklist satisfies the current requirements.

Source: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

**Completed 2026-10-15:** five production captures from the dedicated review
account are in `store-screenshots/iphone-medium/`. They are 1206 × 2622 RGB
PNGs with no alpha channel. All five processed successfully in Apple's asset
library and were placed on the English (US) version 1.0.0 draft under
`IPHONE_DYNAMIC_ISLAND_MEDIUM_PROFILE`. Their verified order is Top 5, Home,
team-mate pick, season leaderboard, race result. `manifest.json` records the
file hashes, asset IDs, and placement IDs. The app remains a draft.

For repeat captures:

- Start a fresh Metro session with `--clear` and screenshot mode enabled.
  A week-old Metro/app session was the source of the disconnected/loading
  capture failure. Explicitly reconnect the simulator's development client.
- Confirm the bundled backend and Clerk instance agree. For production
  captures, use the dedicated review account and production public variables;
  back up and restore the ignored local env file afterward. In this run,
  shell-only overrides with a second Metro process still served dev values;
  changing the local env file and restarting with a clean cache resolved it.
- Use simulator-scoped input, such as AXe (`brew install
  cameroncooke/axe/axe`), with an explicit simulator UDID. Inspect the current
  accessibility tree and wait for the destination before capturing. Avoid
  desktop mouse/keyboard events, which depend on window focus.
- Check every image for loading indicators, offline banners, alerts, and
  development fixture names. Capture the interface itself, without replacing
  text or compositing synthetic results.
- Simulator PNGs include an alpha channel even when the visible image is
  opaque. Remove it before upload and verify dimensions and alpha:

```sh
cd apps/mobile
swift scripts/prepare-store-screenshots.swift store-screenshots/iphone-medium/*.png
sips -g pixelWidth -g pixelHeight -g hasAlpha store-screenshots/iphone-medium/*.png
```

For uploads, use Apple's current asset-library image/placement API and its
live reference-data catalog. The old screenshot-set API is deprecated.
Verify processed assets, display order, and the version's draft state after
uploading. This does not submit the app for review.

The following older workflow creates development fixtures, rather than the
production capture set above:

The app can put itself into a signed-in, populated state without anyone typing
a password, so this is repeatable rather than a manual ritual:

```sh
# 1. Populate the dev deployment (once).
pnpm --filter @grandprixpicks/web dev:setup-scenarios

# 2. Boot the required medium-display simulator and install a dev build.
xcrun simctl boot "iPhone 17 Pro"
pnpm --filter @grandprixpicks/mobile exec expo run:ios --device "iPhone 17 Pro"

# 3. Mint a Clerk sign-in token and start Metro holding it. The app signs
#    itself in on mount, and screenshot mode hides the LogBox banner that
#    otherwise sits exactly where the tab bar is.
TICKET=$(pnpm --filter @grandprixpicks/web dev:signin \
  | grep -o '__clerk_ticket=[^&]*' | cut -d= -f2)
EXPO_PUBLIC_DEV_SIGNIN_TICKET="$TICKET" EXPO_PUBLIC_SCREENSHOT_MODE=1 \
  pnpm --filter @grandprixpicks/mobile exec expo start --dev-client --host lan

# 4. Launch, then capture each screen.
xcrun simctl launch booted com.barrymichaeldoyle.grandprixpicks
xcrun simctl io booted screenshot 01-home.png
```

Three things that will otherwise cost you an afternoon. The dev client
auto-connects to whatever Metro is on **port 8081**, so another project's
bundler on that port will be loaded instead of this one, and the app will crash
on someone else's bundle. Start Metro before anything else, or stop the other
one. Use `--host lan`: on this setup, `localhost` bound Metro on IPv6 while the
dev client attempted IPv4 and could not connect. The committed native config
also suppresses the dev-menu onboarding and floating button during captures.

Navigation does not need the simulator's UI. Every top-level screen has a deep
link, and `simctl openurl` drives them headlessly, which is what makes an
unattended capture run possible:

```sh
xcrun simctl openurl booted grandprixpicks://predict
xcrun simctl openurl booted grandprixpicks://leaderboard
xcrun simctl openurl booted grandprixpicks://more
xcrun simctl openurl booted grandprixpicks://more/settings
```

A session survives an app uninstall, because the Clerk token cache lives in the
iOS keychain and the keychain outlives the app. To capture genuine signed-out
screens, `xcrun simctl erase` the device first.

Tokens expire after 300 seconds, so mint one per run. `simctl openurl` with
`grandprixpicks://dev-signin?ticket=...` works too, but iOS puts a confirmation
sheet in front of custom-scheme opens, which is why the environment variable
exists.

Output on iPhone 17 Pro is 1206 × 2622, with no cropping or scaling needed.

Suggested order, because the first two are what people actually see in search:

1. **Making picks.** The top five picker mid-selection, drivers in team
   colours. This is the product; lead with it.
2. **The weekend.** Session tabs with a countdown to the next lock.
3. **Team-mate picks.** The H2H grid, part answered.
4. **Leaderboard.** Season standings with a few real names.
5. **The feed.** Activity from the players you follow.

Leagues are deliberately absent from this list. There is no league screen
or league entry point in this iOS release.

Captions should say what the screen does, not name it: "Rank the top five
before the session locks" beats "Picks".

## Before submitting

- Set the nine `EXPO_PUBLIC_*` variables plus the three Sentry ones on the EAS
  production environment. See RELEASE.md; a missing value ships as `undefined`
  and nothing fails loudly.
- Check `pnpm --filter @grandprixpicks/mobile lint` passes. It includes the
  native asset check, which prebuilds the iOS project and covers the app icon,
  the privacy manifest, and the push entitlement for the Release
  configuration.
- Guideline 5.1.1(v) is covered on both counts: the app is browsable without
  an account, and Settings has a working Delete account that removes the Clerk
  user and its data. Nothing to do here beyond not regressing it.
