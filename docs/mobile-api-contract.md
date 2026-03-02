# Mobile API Contract (Convex)

This document defines the initial app-facing contract for the mobile client.
It references current Convex public functions and the response shapes mobile should rely on.

## Scope

- Authenticated user profile/settings
- Race calendar and race detail
- Top 5 predictions
- H2H predictions
- Leaderboards

## Conventions

- IDs are Convex IDs (`Id<'table'>`) and should be treated as opaque strings.
- Times are Unix epoch milliseconds.
- If a query returns `null`, mobile should treat it as "not available yet" rather than hard error.
- Session type enum:
  - `quali`
  - `sprint_quali`
  - `sprint`
  - `race`

## Authentication

Mobile must authenticate with Clerk and call Convex with the authenticated session.

Primary user APIs:

- `api.users.me` (query)
  - Returns current user profile/settings or `null` if signed out.
- `api.users.syncProfile` (mutation)
  - Args: `{ timezone?: string, locale?: string }`
  - Called on app start/sign-in to upsert user profile.

## Races

- `api.races.listRaces` (query)
  - Args: `{ season?: number }`
  - Returns races sorted by round.
- `api.races.getNextRace` (query)
  - Returns next upcoming race or `null`.
- `api.races.getRaceBySlug` (query)
  - Args: `{ slug: string }`
  - Returns race doc or `null`.
- `api.races.getPredictionOpenAt` (query)
  - Args: `{ raceId }`
  - Returns epoch ms when prediction opens, or `null`.

## Top 5 Predictions

- `api.predictions.myWeekendPredictions` (query)
  - Args: `{ raceId }`
  - Returns:
    - `hasSprint: boolean`
    - `predictions: Record<SessionType, Id<'drivers'>[] | null>`
- `api.predictions.submitPrediction` (mutation)
  - Args:
    - `raceId`
    - `picks: Id<'drivers'>[]` (length 5, unique)
    - `sessionType?: SessionType`
  - Behavior:
    - If `sessionType` omitted, cascades to all open weekend sessions.
    - May queue a delayed H2H nudge when Top 5 becomes fully complete.
- `api.predictions.randomizePredictions` (mutation)
  - Args: `{ raceId }`

## H2H Predictions

- `api.h2h.getMatchupsForSeason` (query)
  - Args: `{ season?: number }`
  - Returns matchup list with enriched drivers.
- `api.h2h.myH2HPredictionsForRace` (query)
  - Args: `{ raceId }`
  - Returns `Record<SessionType, Record<matchupId, predictedWinnerId> | null>` or `null` if signed out.
- `api.h2h.submitH2HPredictions` (mutation)
  - Args:
    - `raceId`
    - `picks: Array<{ matchupId, predictedWinnerId }>`
    - `sessionType?: SessionType`
  - Requires Top 5 prediction to exist first.

## Leaderboards

- `api.leaderboards.getSeasonLeaderboard` (query)
- `api.leaderboards.getFriendsLeaderboard` (query)
- `api.leaderboards.getFriendsH2HLeaderboard` (query)
- `api.leaderboards.getLeagueLeaderboard` (query)
- `api.leaderboards.getRaceLeaderboard` (query)

Mobile should treat these as paginated/derived views and not infer table internals.

## Profile & Settings

- `api.users.updateProfile` (mutation)
  - Args: `{ displayName?: string, username?: string }`
- `api.users.updateNotificationSettings` (mutation)
  - Args: `{ emailReminders?: boolean, emailResults?: boolean }`
- `api.users.updateRegionalSettings` (mutation)
  - Args: `{ timezone?: string | null, locale?: string | null }`
- `api.users.updatePrivacySettings` (mutation)
  - Args: `{ showOnLeaderboard: boolean }`

## Follows

- `api.follows.follow` (mutation)
- `api.follows.unfollow` (mutation)
- `api.follows.isFollowing` (query)
- `api.follows.getFollowCounts` (query)
- `api.follows.listFollowers` (query)
- `api.follows.listFollowing` (query)

## Leagues

Core mobile-safe league APIs:

- `api.leagues.getMyLeagues` (query)
- `api.leagues.listPublicLeagues` (query)
- `api.leagues.getLeagueBySlug` (query)
- `api.leagues.getLeagueMembers` (query)
- `api.leagues.createLeague` (mutation)
- `api.leagues.joinLeague` (mutation)
- `api.leagues.leaveLeague` (mutation)
- `api.leagues.updateLeague` (mutation)

## Error Handling Contract

Mobile should surface server errors as user-friendly messages where possible.
Common errors to handle explicitly:

- Not authenticated / admin only
- Race not found
- Predictions locked / only next race is open
- Submit Top 5 before H2H
- Validation errors (slug, username, duplicate picks)

## Feature Checklist (By Screen)

Use this as the implementation sequence and definition-of-done list.

### 1) App Boot / Auth Gate

- [ ] Call `api.users.me` after auth state resolves.
- [ ] If signed in, call `api.users.syncProfile` with device timezone/locale.
- [ ] Handle signed-out state and protected screen redirects.

### 2) Home Screen

- [ ] Load next race via `api.races.getNextRace`.
- [ ] Load race list preview via `api.races.listRaces`.
- [ ] Show graceful empty state if no upcoming race.

### 3) Race Calendar Screen

- [ ] Fetch full season races via `api.races.listRaces({ season })`.
- [ ] Support filtering by status (`upcoming`, `locked`, `finished`) in UI.
- [ ] Navigate to race detail using race slug/id.

### 4) Race Detail Screen

- [ ] Fetch race via `api.races.getRaceBySlug`.
- [ ] Fetch prediction-open time via `api.races.getPredictionOpenAt`.
- [ ] Display lock/open states from returned timestamps/status.

### 5) Top 5 Picks Screen

- [ ] Read existing picks with `api.predictions.myWeekendPredictions`.
- [ ] Submit with `api.predictions.submitPrediction`.
- [ ] Optionally expose `api.predictions.randomizePredictions`.
- [ ] Handle locked-session errors cleanly.

### 6) H2H Picks Screen

- [ ] Load season matchups via `api.h2h.getMatchupsForSeason`.
- [ ] Load current H2H picks via `api.h2h.myH2HPredictionsForRace`.
- [ ] Submit picks with `api.h2h.submitH2HPredictions`.
- [ ] Handle “Submit Top 5 first” error path.

### 7) Leaderboards Screen

- [ ] Season leaderboard: `api.leaderboards.getSeasonLeaderboard`.
- [ ] Friends leaderboard: `api.leaderboards.getFriendsLeaderboard`.
- [ ] Friends H2H leaderboard: `api.leaderboards.getFriendsH2HLeaderboard`.
- [ ] Race leaderboard: `api.leaderboards.getRaceLeaderboard`.

### 8) Profile Screen

- [ ] Load current user with `api.users.me`.
- [ ] Update profile via `api.users.updateProfile`.
- [ ] Show follow counts with `api.follows.getFollowCounts`.

### 9) Notifications & Regional Settings Screen

- [ ] Toggle reminders/results with `api.users.updateNotificationSettings`.
- [ ] Update timezone/locale with `api.users.updateRegionalSettings`.
- [ ] Update leaderboard privacy via `api.users.updatePrivacySettings`.

### 10) Leagues Screens

- [ ] My leagues: `api.leagues.getMyLeagues`.
- [ ] Discover leagues: `api.leagues.listPublicLeagues`.
- [ ] League detail: `api.leagues.getLeagueBySlug` + `api.leagues.getLeagueMembers`.
- [ ] Create/join/leave/update via league mutations.

### 11) Social / Follow Screens

- [ ] Follow/unfollow actions via `api.follows.follow` / `api.follows.unfollow`.
- [ ] Following state via `api.follows.isFollowing`.
- [ ] Followers/following lists via `api.follows.listFollowers` and `api.follows.listFollowing`.

### 12) Push Readiness (Client Side)

- [ ] Ensure race links from push payload open correct screen/path.
- [ ] Ensure auth/session restoration before processing deep links.
- [ ] Verify reminder nudges and results notifications produce expected navigation.

## Versioning Note

This is a snapshot contract for mobile kickoff. If any function args/returns change, update this doc in the same PR.
