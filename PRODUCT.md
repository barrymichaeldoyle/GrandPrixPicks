# Product

<!-- impeccable:product-schema 1 -->

Cross-app product truth for Grand Prix Picks, shared by `apps/web` and
`apps/mobile`. Per-app records override the platform-specific sections:
see `apps/web/PRODUCT.md`.

Full implemented-behavior reference: `docs/web-product-specification.md`
(specification version 1.0, implementation reviewed 24 July 2026).

## Platform

adaptive

## Users

Primary across the whole product: **the solo Formula 1 fan**, arriving alone
rather than through a friend. On web this is a cold landing from search, Reddit,
or a shared social card; on mobile it is an individual install. They are deciding
in a single visit whether this game is worth their time.

Confirmed secondary audiences, in descending priority:

- returning weekly regulars who mainly need the pick loop to be fast;
- competitive players who care about season standings and per-session score
  breakdowns;
- friend groups arriving through a league invite link;
- site operators who configure race weekends, publish results, and manage
  announcements and users.

Leagues are not currently a growth channel. Acquisition is individual, so
first-visit comprehension and conversion outrank league virality in any tradeoff.

## Product Purpose

A fan-made Formula 1 prediction game. For each competitive session in a Grand
Prix weekend, players pick the top five finishers and call the winner of each
teammate head-to-head matchup. The backend scores those picks once official
results are published, then ranks players globally, among people they follow,
and inside leagues.

Success is a player who gets their picks in before every session of every
weekend, all season, without being nagged into it.

## Positioning

**Fast, with no fantasy overhead.** There are no budgets, transfers,
constructors, driver ownership, or squad management. A full set of picks takes
under a minute. Every neighboring product in the category (F1 Fantasy above all)
buys its depth with a management burden Grand Prix Picks deliberately refuses.

Three supporting mechanisms, true and stated, but subordinate to the line above:

- **Every session is its own game.** A sprint weekend has four independent
  deadlines (sprint quali, sprint, quali, race), each with its own picks, lock,
  results, and score. It is not one weekend bet.
- **Order-sensitive scoring.** Points depend on the slot a driver is placed in
  (5 exact / 3 off-by-one / 1 elsewhere in the actual top five / 0), so the right
  five in the wrong order is a real loss.
- **The full game is free.** Predictions, scoring, and global leaderboards are
  permanently free. The Season Pass only raises league creation and join limits.

## Operating Context

The dominant usage scene is **a phone, shortly before lights out**: mobile,
under time pressure, often minutes to an hour before the session locks. Picks
compete for attention with the broadcast itself and with whatever else the
player is doing. Any flow that assumes an unhurried desktop session is designed
for the wrong moment.

Consequences that are product facts, not preferences:

- the pick loop must complete on a phone, one-handed, in well under a minute;
- session lock times are hard, server-authoritative deadlines that arrive
  whether or not the player is ready;
- notification timing is functional, not promotional: a nudge that arrives after
  lock has failed;
- results arrive asynchronously, hours after the session, so scoring is a
  separate return visit from picking.

The F1 calendar sets the rhythm. Engagement is spiky around race weekends and
near-zero between them. Sprint weekends double the number of deadlines.

## Capabilities and Constraints

Authoritative detail lives in `docs/web-product-specification.md`. The durable
facts:

**Weekend model.** Regular weekend: qualifying, then race. Sprint weekend:
sprint qualifying, sprint, qualifying, race, in that order. Practice sessions are
never prediction or scoring sessions. Each session locks independently at its
start time. Race status moves `upcoming` to `locked` to `finished`.

**Picks.** Exactly five drivers per session, ordered. Cascade mode applies one
submission to every session of a weekend; specific mode edits a single session.
Head-to-head is a separate per-session pick of a winner from each teammate pair,
1 point each. Players predict the next upcoming race only.

**Scoring.** `scoreTopFive()` in `apps/backend/convex/lib/scoring.ts`, identical
across all four session types with no per-session branching. Maximum 25 points
per session for Top 5. Season standings are the sum of session scores. We score
the official FIA classification: grid penalties do not affect qualifying, post-race
penalties do.

**Season Pass.** One-time purchase for one named F1 season, not a recurring
subscription and not carried across seasons. Current season 2026, standard
implemented price USD 19.99, sold through Paddle. It changes league limits only
and never changes scoring. Free: 5 private leagues created, 5 private joined, 0
public created, 5 public joined. Pass: 50 private created, unlimited private
joined, 5 public created, unlimited public joined. Promotional prices are
operational configuration and must be revalidated before any copy reuses them.

**Social.** Follows, an activity feed of system-generated events (score
published, session locked, joined league, streak milestone), and emoji
reactions on those events. There are no user-authored posts and no direct
messaging.

**Privacy rule with design consequences.** Another player's picks and
participation for an open session must never be exposed before that session
locks. This constrains every profile, feed, league, and leaderboard surface.

**Explicit non-goals.** Fantasy budgets, constructors, transfers, or driver
ownership; live timing or commentary; real-money wagering, pools, prizes, or
payouts; user-authored feed posts or direct messaging; recurring subscriptions;
cross-season entitlement; official Formula 1 account, ticketing, or merchandise
functionality.

## Brand Commitments

**Name:** Grand Prix Picks. Primary URL grandprixpicks.com.

**Voice**, binding on all player-facing copy across every app:

- **No em dashes.** They read as generic AI-generated content. Use a colon, a
  full stop, or parentheses instead.
- **Plain and direct, no hype.** Say what the thing does. No exclamation-heavy
  marketing voice, no manufactured urgency, no growth-hack framing.
- **Fan to fan, F1-literate.** Written by someone who actually watches the
  races. Uses real session and team vocabulary without condescending to the
  reader by explaining the basics.
- **Never imply gambling.** No wagering, odds, stakes, betting, or prize
  language anywhere, including incidental phrasing. This is both a legal
  constraint and a voice constraint.

**Legal identity constraints:**

- Grand Prix Picks is fan-made and must never be presented as an official
  Formula 1 product.
- No real-money gaming, prizes, or wagering exist in the product, and copy must
  not imply otherwise.
- Terms, privacy, refund policy, and cookie controls stay reachable from public
  navigation and footer surfaces.
- Driver, team, race, and championship references follow applicable brand and
  data-use constraints.

## Evidence on Hand

Real and citable:

- **The live product itself.** Real race data, real leaderboards, and real
  scored results. Screenshots and live data are legitimate demonstration
  material and are the strongest proof available.
- **Player and usage numbers.** Real signup and active-player figures exist and
  may be shown. Barry supplies the actual figures when a surface needs them.
  Never estimate, round up, or invent a number.
- **Community channels.** u/GrandPrixPicks and r/GPPicks are real and may be
  referenced.
- **Generated share assets.** Open Graph share cards render live per-race and
  per-user data (`apps/web/server/routes/og/`, `apps/web/src/lib/og/`).

Absent, and must never be fabricated: testimonials, quoted users, press
coverage, reviews, awards, partner or sponsor logos, and any claim of official
Formula 1 affiliation.

## Product Principles

1. **The pick loop is the product.** Everything else is in service of getting a
   set of picks submitted before the lock, on a phone, in under a minute. When a
   surface competes with that loop, the loop wins.
2. **Earn the first visit.** A solo fan arriving cold decides in one session.
   Public surfaces must be comprehensible and playable without an account, and
   must not defer their value behind sign-in.
3. **Refuse fantasy complexity.** Every proposed feature that adds management
   burden (budgets, squads, transfers, ownership) is measured against the
   positioning and is presumed a no.
4. **The server owns time and truth.** Lock times, results, and scores are
   backend-authoritative. Interfaces report that state; they never imply the
   client can negotiate it.
5. **Nothing leaks before lock.** Pre-lock pick privacy is an invariant, not a
   setting, and it constrains every social surface.
6. **Free stays free.** The prediction game and global leaderboards are never
   gated. Monetization touches league scale only.

## Accessibility & Inclusion

Product-specific requirements, from specification section 21:

- Drag-based prediction or result ordering must always have an equivalent
  pointer/tap and keyboard-accessible interaction. The top-5 picker is the
  highest-risk surface here.
- Non-color indicators are required for selected, locked, scored, and error
  states. Team colors and result states must not be color-only signals.
- `aria-live` feedback for asynchronous save, error, and success states, since
  submission happens against a hard deadline and silent failure is costly.
- Keyboard-operable navigation, forms, tabs, dialogs, and prediction controls,
  with visible focus states and accessible names for icon-only controls.
- Dialog focus management with escape and cancel behavior.
- Reduced-motion behavior for nonessential animations when the OS requests it.
