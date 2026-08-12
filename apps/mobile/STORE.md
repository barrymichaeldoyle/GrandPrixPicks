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
The season is back. Get your top five in before qualifying locks, call the team-mate duels, and see how you stack up against everyone else this weekend.
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
First release. Pick the top five for every session, call the team-mate duels,
and play the season out against your friends.
```

## App Review Information

**A demo account is required.** The app opens on a sign-in screen, and a
reviewer with no way in is the single most common cause of a first rejection.
Create a real account, put the credentials in App Review Information, and make
sure it has picks and a league so the reviewer sees a populated app rather than
empty states.

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

Declare what is actually collected:

| Data                                    | Purpose                        | Linked to identity |
| --------------------------------------- | ------------------------------ | ------------------ |
| Email address                           | Account authentication (Clerk) | Yes                |
| User content (picks, league membership) | App functionality              | Yes                |
| Usage data                              | Analytics (PostHog)            | Yes                |
| Crash and performance data              | Diagnostics (Sentry)           | Yes                |

## Screenshots

Apple requires one 6.9 inch set (1320 x 2868). Everything else can scale from
it, so start there and add more only if you want device-specific framing.

Capture with the app signed in and populated, on an iPhone 17 Pro Max
simulator:

```sh
xcrun simctl io booted screenshot shot.png
```

Suggested order, because the first two are what people actually see in search:

1. **Making picks.** The top five picker mid-selection, drivers in team
   colours. This is the product; lead with it.
2. **The weekend.** Session tabs with a countdown to the next lock.
3. **Team-mate duels.** The H2H grid, part answered.
4. **Leaderboard.** Season standings with a few real names.
5. **A league.** Private league standings, to show it is social.
6. **The feed.** Reactions on somebody's picks.

Captions should say what the screen does, not name it: "Rank the top five
before the session locks" beats "Picks".

## Before submitting

- Set the nine `EXPO_PUBLIC_*` variables plus the three Sentry ones on the EAS
  production environment. See RELEASE.md; a missing value ships as `undefined`
  and nothing fails loudly.
- Check `pnpm --filter @grandprixpicks/mobile lint` passes, which now includes
  the native icon check.
- Consider letting the app be browsed without an account. Guideline 5.1.1(v)
  asks that apps not require registration for content that does not need it,
  and the web already does try-before-signup. Reviewers see a login wall today.
