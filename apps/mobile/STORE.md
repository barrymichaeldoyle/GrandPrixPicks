# App Store listing

Draft copy for App Store Connect. iOS only for now.

Character limits are Apple's and are hard: the name and subtitle truncate in
search results, so both are written to survive that rather than to fit exactly.

## Metadata

| Field              | Value                                                   | Limit        |
| ------------------ | ------------------------------------------------------- | ------------ |
| App Name           | `Grand Prix Picks`                                      | 30 (16 used) |
| Subtitle           | `Predict every F1 session`                              | 30 (24 used) |
| Primary category   | Sports                                                  |              |
| Secondary category | Entertainment                                           |              |
| Copyright          | `2026 Barry Michael Doyle Software Solutions (Pty) Ltd` |              |
| Support URL        | `https://grandprixpicks.com/support`                    | verified 200 |
| Marketing URL      | `https://grandprixpicks.com`                            |              |
| Privacy Policy URL | `https://grandprixpicks.com/privacy`                    | verified 200 |

### Keywords (100 characters)

```
f1,formula1,racing,motorsport,prediction,predictor,fantasy,league,qualifying,grid,standings
```

90 characters. Deliberately excludes "grand", "prix" and "picks": the app name
is already indexed, and repeating it wastes the field. Comma separated with no
spaces, because spaces count.

### Promotional text (170 characters)

Editable without review, so use it for the current round.

```
The season is back. Get your Top 5 in before qualifying locks, choose who finishes ahead in each team, and see how you stack up against everyone else this weekend.
```

## Description

```
Everyone's a strategist on Sunday. Prove it.

Grand Prix Picks turns every session of a Formula 1 weekend into a game you
play against your friends and the rest of the grid.

HOW IT WORKS

Rank the top five for qualifying, the sprint and the race. Then call every
team-mate duel: which of the two drivers in each car finishes ahead.

Scoring rewards precision, not luck. Five points for putting a driver in
exactly the right position. Three for being one place out. One for naming a
driver who finished in the top five but landing them further away. Twenty five
points is a perfect session.

Every session locks at its own start time, so a sprint weekend gives you four
separate chances to be right, and a bad Saturday does not cost you Sunday.

PLAY WITH PEOPLE

Start a private league for the group chat, or take on the global leaderboard.
Follow other players, watch their picks land or fall apart, and react to them
in the feed.

BUILT ON THE OFFICIAL RESULT

Scores come from the official classification, not the order the cars crossed
the line. If the stewards apply a penalty after the flag, your score moves with
it, the same way the championship does.

FREE TO PLAY

No wagering, no stakes, no prizes. Just whether you were right.
```

## What's New (version 1.0.0)

```
First release. Pick your Top 5 for every session, choose who finishes ahead in each team,
and play the season out against your friends.
```

## App Review Information

**Supply a demo account anyway.** The app no longer opens on a sign-in
screen: home, picks, leaderboard and the feed are all browsable signed out, so
a reviewer can reach the product without an account. Settings and notifications
still gate, and only a signed-in account shows submitted picks, a personal
standing and the notification bell. Create a real account with picks against
the current round, put the credentials in App Review Information, and the
reviewer sees a populated app rather than empty states.

Notes worth adding for the reviewer:

```
Grand Prix Picks is a free prediction game for Formula 1. There is no
wagering, no purchase of entries, and no prizes: users predict finishing
orders and are scored on accuracy.

Sign in with Apple is supported. Accounts can be deleted from
Settings > Delete account, which removes the account and its data.
```

## Age rating

Expect 4+. There is no gambling: nothing is staked, bought or won. If the
questionnaire asks about "Contests", the honest answer is that scores are for
standing only, with no prize.

## Privacy nutrition labels

Declare what is actually collected. The same five types are declared in
`ios/GrandPrixPicks/PrivacyInfo.xcprivacy`, so keep the two in step:

| Data                                    | Purpose                        | Linked to identity |
| --------------------------------------- | ------------------------------ | ------------------ |
| Email address                           | Account authentication (Clerk) | Yes                |
| User content (picks, league membership) | App functionality              | Yes                |
| Usage data                              | Analytics (PostHog)            | Yes                |
| Crash and performance data              | Diagnostics (Sentry)           | Yes                |

## Screenshots

Apple requires one 6.9 inch set (1320 x 2868). Everything else can scale from
it, so start there and add more only if you want device-specific framing.

The app can put itself into a signed-in, populated state without anyone typing
a password, so this is repeatable rather than a manual ritual:

```sh
# 1. Populate the dev deployment (once).
pnpm --filter @grandprixpicks/web dev:setup-scenarios

# 2. Boot a 6.9 inch simulator and install a dev build.
xcrun simctl boot "iPhone 17 Pro Max"
pnpm --filter @grandprixpicks/mobile exec expo run:ios --device "iPhone 17 Pro Max"

# 3. Mint a Clerk sign-in token and start Metro holding it. The app signs
#    itself in on mount, and screenshot mode hides the LogBox banner that
#    otherwise sits exactly where the tab bar is.
TICKET=$(pnpm --filter @grandprixpicks/web dev:signin \
  | grep -o '__clerk_ticket=[^&]*' | cut -d= -f2)
EXPO_PUBLIC_DEV_SIGNIN_TICKET="$TICKET" EXPO_PUBLIC_SCREENSHOT_MODE=1 \
  pnpm --filter @grandprixpicks/mobile exec expo start --dev-client

# 4. Launch, then capture each screen.
xcrun simctl launch booted com.barrymichaeldoyle.grandprixpicks
xcrun simctl io booted screenshot 01-home.png
```

Two things that will otherwise cost you an afternoon. The dev client
auto-connects to whatever Metro is on **port 8081**, so another project's
bundler on that port will be loaded instead of this one, and the app will crash
on someone else's bundle. Start Metro before anything else, or stop the other
one.

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

Output is 1320 x 2868, exactly the 6.9 inch requirement, with no cropping or
scaling needed.

Suggested order, because the first two are what people actually see in search:

1. **Making picks.** The top five picker mid-selection, drivers in team
   colours. This is the product; lead with it.
2. **The weekend.** Session tabs with a countdown to the next lock.
3. **Team-mate picks.** The H2H grid, part answered.
4. **Leaderboard.** Season standings with a few real names.
5. **The feed.** Reactions on somebody's picks, to show it is social.

Leagues are deliberately absent from this list: they are managed on the web,
and the More tab links out rather than rendering them. There is no league
screen in the app to photograph.

Captions should say what the screen does, not name it: "Rank the top five
before the session locks" beats "Picks".

## Before submitting

- Set the nine `EXPO_PUBLIC_*` variables plus the three Sentry ones on the EAS
  production environment. See RELEASE.md; a missing value ships as `undefined`
  and nothing fails loudly.
- Check `pnpm --filter @grandprixpicks/mobile lint` passes. It includes the
  native asset check, which covers the app icon, the Info.plist keys app.json
  owns, and the push entitlement for the Release configuration.
- Guideline 5.1.1(v) is covered on both counts: the app is browsable without
  an account, and Settings has a working Delete account that removes the Clerk
  user and its data. Nothing to do here beyond not regressing it.
