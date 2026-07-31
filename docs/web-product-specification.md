# Grand Prix Picks Web App Product Specification

**Status:** Implemented-product reference  
**Product:** Grand Prix Picks web application  
**Primary URL:** [grandprixpicks.com](https://grandprixpicks.com)  
**Specification version:** 1.0  
**Implementation reviewed:** 24 July 2026  
**Current product season:** 2026

## 1. Purpose of this document

This document describes the web product as it is implemented in this
repository. It is intended to be the shared product reference for design,
engineering, testing, support, and future planning.

It covers:

- the product proposition and target users;
- game rules and scoring;
- anonymous, authenticated, paid, league-admin, and site-admin capabilities;
- every user-facing web surface and its principal states;
- social, league, billing, notification, and sharing behavior;
- key validation, privacy, accessibility, and operational requirements.

This is a product specification, not an API contract or implementation guide.
When it conflicts with executable behavior, the implementation remains the
runtime source of truth and this document should be corrected.

## 2. Product summary

Grand Prix Picks is a fan-made Formula 1 prediction game. Players predict the
top five finishers and the winners of teammate head-to-head matchups for each
competitive session in a Grand Prix weekend. The app scores predictions after
official results are published and ranks players globally, among people they
follow, and inside leagues.

The core prediction game and leaderboards are free. A season-specific paid
Season Pass expands league participation and creation limits. The product does
not offer real-money gaming, prizes, or wagering.

### 2.1 Core value proposition

Players can:

1. make picks before each session begins;
2. earn points based on prediction accuracy;
3. follow their performance across a weekend and the season;
4. compare results with the global community, followed players, and leagues;
5. share picks and results with friends.

### 2.2 Target users

- **Casual F1 fans** who want a simple prediction game.
- **Competitive fans** who want season-long rankings and detailed scores.
- **Friend groups and communities** that want private or public leagues.
- **Social players** who follow other players, react to picks, and share results.
- **Site operators** who configure race weekends, publish results, and manage
  product announcements and users.

## 3. Product principles

- **Easy to start:** visitors may build a draft before creating an account.
- **Session-by-session competition:** every competitive session has its own
  deadline, picks, results, and score.
- **No pre-lock information leakage:** another player's picks and participation
  for an open session must not be exposed before that session locks.
- **Transparent scoring:** scored predictions show the actual finish, points,
  and per-pick breakdown.
- **Social without blocking the core game:** prediction and global leaderboard
  functionality remains available without a Season Pass.
- **Server-authoritative timing and scoring:** race configuration, lock times,
  result publication, and scores are controlled by the backend.

## 4. User and permission model

### 4.1 Anonymous visitor

An anonymous visitor can:

- view the home page, race calendar, public race pages, published results,
  global leaderboards, pricing, and legal pages;
- browse public league listings and view a league's public summary;
- view public player profiles and eligible historical prediction data;
- begin assembling a Top 5 or H2H draft locally;
- view signed-out race previews and public share cards.

An anonymous visitor cannot:

- save predictions;
- appear on leaderboards;
- follow players;
- view a personalized feed;
- join, create, or manage leagues;
- purchase a Season Pass;
- manage settings or notifications;
- contact support through the authenticated support form.

When an anonymous visitor attempts to save or use an authenticated feature, the
app prompts them to sign in. A locally assembled prediction draft should remain
available through that transition when supported by the prediction flow.

### 4.2 Authenticated player

An authenticated player has all anonymous capabilities and can:

- save and revise eligible predictions before their session deadlines;
- accumulate scores and leaderboard positions;
- view their prediction history;
- maintain a public profile;
- follow and unfollow players;
- view personalized and league feeds;
- add, change, or remove a reaction on feed items;
- create, join, leave, and share leagues within plan limits;
- configure profile, regional, email, and device push settings;
- receive in-app notifications;
- submit support requests;
- purchase and use a Season Pass.

### 4.3 Season Pass player

A Season Pass is attached to one player and one F1 season. It changes league
limits for that season but does not change prediction scoring.

For the applicable season, a Season Pass player can:

- create public leagues;
- create more private leagues;
- join an unlimited number of public and private leagues;
- retain all free player capabilities.

### 4.4 League administrator

The creator of a league becomes its first administrator. League administrators
can:

- edit the league name, slug, and description;
- add, replace, or remove a password on a private league;
- promote members to administrator and demote other administrators where the
  last-admin rule permits it;
- remove members;
- permanently delete the league;
- access league settings.

League visibility cannot be changed after creation.

### 4.5 Site administrator

Site administrators have access to the admin console and can:

- inspect and manage race weekend records;
- create or update race configuration and session timing;
- enter, update, publish, amend, or roll back session results;
- inspect player prediction-completion status;
- manage site announcements;
- inspect user administration views;
- use supported testing/scenario controls outside production where enabled.

Administrative mutations must remain server-authorized; hiding the UI alone is
not an authorization mechanism.

## 5. Formula 1 weekend model

### 5.1 Supported session types

A regular weekend contains:

1. Qualifying (`quali`)
2. Race (`race`)

A sprint weekend contains:

1. Sprint Qualifying (`sprint_quali`)
2. Sprint (`sprint`)
3. Qualifying (`quali`)
4. Race (`race`)

Practice sessions are not prediction or scoring sessions.

### 5.2 Weekend and session lifecycle

Each race weekend has configured session start times, a season, round, venue
metadata, sprint status, and an overall race status.

From a player's perspective, each supported session moves through:

1. **Not available:** the session is not currently eligible for saved picks.
2. **Open:** picks can be created or changed.
3. **Locked:** the scheduled session start has been reached; picks cannot be
   created or changed.
4. **Awaiting results:** picks are locked but results have not been published.
5. **Scored:** official results have been published and prediction scores are
   available.
6. **Amended:** previously published results or scores have been corrected.

Only the next upcoming race is eligible for prediction submission. The product
may display other races, but the backend rejects saved predictions for a race
that is not the next upcoming race.

### 5.3 Deadlines

- Every session has its own lock time.
- Picks lock at the configured scheduled start of that session.
- A locked session cannot be edited.
- On a bulk/cascading save, already locked sessions are skipped and eligible
  open sessions are updated.
- A save explicitly targeting a locked session fails with a locked-session
  error.
- If every applicable session is locked, prediction submission fails.

Displayed times use the browser's local timezone and time format. Account
regional settings affect email rendering, not web page time rendering.

## 6. Prediction games

### 6.1 Top 5

For each supported session, the player ranks exactly five unique drivers in
predicted finishing order.

Requirements:

- exactly five drivers are required to submit;
- a driver may appear only once in a session's picks;
- order is meaningful;
- saved picks can be revised until the relevant session locks;
- a general weekend submission may cascade picks to all still-open applicable
  sessions;
- the randomize action generates a Top 5 for each still-open applicable
  session.

The UI may store incomplete anonymous and authenticated drafts locally. A draft
is not an official entry until it has been saved to the backend by an
authenticated player.

### 6.2 Top 5 scoring

Each of the five predicted drivers scores independently:

| Outcome                                                               | Points |
| --------------------------------------------------------------------- | -----: |
| Driver finishes in the exact predicted position within the top five   |      5 |
| Driver finishes one position away from the predicted position         |      3 |
| Driver is in the actual top five but is two or more positions away    |      1 |
| Driver is outside the actual top five, absent, or otherwise unmatched |      0 |

The maximum Top 5 score is 25 points per session.

Important scoring detail: the one-position-away rule is based on absolute
position difference. The implementation awards 3 points when the actual result
is one place away, including a predicted fifth-place driver who finishes sixth.

### 6.3 Teammate Head-to-Head (H2H)

For each supported session, the player chooses which driver in each configured
teammate pairing will finish ahead.

Requirements:

- matchups are based on the configured season driver/team pairings;
- one driver must be selected for each submitted matchup;
- the selected driver must belong to that matchup;
- Top 5 picks must exist before H2H picks can be submitted;
- H2H selections can be revised until the relevant session locks;
- the first complete selection may save automatically when the final matchup is
  chosen, as indicated by the web interaction;
- H2H picks are scored only after relevant results are published.

Each correct matchup earns 1 H2H point. An incorrect or unscorable matchup earns
0 points.

### 6.4 Combined score

Combined standings add Top 5 points and H2H points over the selected race
weekend or season. Top 5 and H2H standings remain separately available.

Sprint weekends contain more scoring sessions than regular weekends and
therefore offer a higher possible weekend total.

### 6.5 Pick visibility

- A player can always view their own saved picks.
- Other users' session picks must remain hidden until that session is locked.
- Public profiles must not reveal that another player participated in a still
  open weekend.
- Submission timestamps for hidden picks must not be exposed.
- Once a session locks, eligible picks may appear in profiles and feed events.
- Published results and official classifications are public.

## 7. Leaderboards

The leaderboard supports three independent dimensions:

| Dimension    | Options              |
| ------------ | -------------------- |
| Time scope   | Race Weekend, Season |
| Game mode    | Combined, Top 5, H2H |
| Player scope | Global, Following    |

### 7.1 Global leaderboard

- Available publicly.
- Includes eligible players with published scores.
- Displays rank, player identity, and the score relevant to the selected time
  scope and game mode.
- Weekend mode allows selection of an eligible race.
- Season mode aggregates published scores for the current season.
- Long season boards support incremental loading.

### 7.2 Following leaderboard

- Requires authentication.
- Restricts the board to the signed-in player's social graph as implemented,
  with viewer context where applicable.
- Supports the same time and game-mode choices as the global board.

### 7.3 Visibility timing

A weekend leaderboard is shown only when the corresponding results/scores are
published and visible. Before that, the UI shows an appropriate unavailable,
awaiting-results, or empty state rather than leaking picks.

### 7.4 League standings

Each league provides a season standings view for league members. It ranks
members using the league's applicable scoring data and provides links to member
profiles. League membership is season-specific.

## 8. Race calendar and race detail

### 8.1 Race calendar

The race calendar:

- lists the configured races for the active season in round order;
- identifies upcoming, active/locked, and completed weekends;
- shows venue/date/session timing as available;
- directs the player to make picks, review picks, or view results according to
  state;
- includes loading, no-races, and error states.

### 8.2 Race detail

The race detail page is the primary play surface. It:

- displays race identity, round, date, venue/country, sprint status, and session
  schedule;
- provides session navigation;
- shows a live countdown or locked/results status;
- hosts Top 5 and H2H prediction workflows;
- shows saved, unsaved, saving, saved-success, locked, validation, and failure
  states;
- displays official results and player scoring after publication;
- provides weekend score summaries and recaps;
- supports share actions and share-card metadata;
- gives signed-out visitors a preview and a path to sign in when saving.

The page must prevent an apparent successful save when the backend has rejected
the action due to timing, eligibility, authentication, or validation.

### 8.3 Weekend recap

When sufficient results exist, the race page can summarize:

- session results;
- the player's Top 5 and H2H performance;
- session and weekend point totals;
- scoring breakdowns;
- completed versus awaiting-results states.

Results may be amended. The UI and notifications must represent the latest
published score, not preserve a superseded score as authoritative.

## 9. Home route

The `/` route has two separate experiences selected from the server-resolved
authentication state. The page trees do not mix marketing and player content.

### 9.1 Public landing page

The signed-out landing page:

- explains the Top 5 and H2H games;
- identifies the next or currently relevant race weekend;
- displays session schedule and countdown/status information;
- directs visitors to begin picks before creating an account;
- previews scoring, season progression, social play, and leaderboards;
- shows recent participation/social proof where data is available;
- answers core questions about cost, accounts, scoring, H2H, deadlines, and
  prediction availability;
- makes clear that the product is fan-made and does not involve real-money
  gaming.

Core home content must remain useful when no next race, current result, top
player, or participation data is available.

### 9.2 Authenticated dashboard

The signed-in dashboard replaces the public landing page at the same `/` URL.
It:

- makes the current race weekend and its next required action the dominant
  surface;
- reports Top 5 and H2H completion for every applicable session;
- uses backend-provided session capabilities for open, locked, editable, and
  results-available states;
- links directly to the most relevant race session;
- summarizes the player's latest scored weekend and season standing;
- provides shortcuts to the player's leagues;
- includes the personalized activity feed below the time-sensitive content.

The dashboard must not repeat the public product pitch, scoring explainer, or
conversion FAQ. When no weekend or scored result exists, it shows useful
player-specific empty states rather than marketing content.

## 10. Player profiles and prediction history

### 10.1 Public profile

A profile is addressed by username and can display:

- avatar, display name, and username;
- follower and following counts;
- follow/unfollow control for another authenticated viewer;
- season stats and ranking;
- eligible prediction history and score cards;
- profile activity derived from published score events;
- a shortcut to the owner's next-race picks when the viewer owns the profile.

Missing profiles show a not-found state.

### 10.2 Prediction history

The signed-in player's “My Predictions” page displays their historical race
weekends, saved session picks, published results, score breakdowns, and weekend
totals where available.

History distinguishes:

- saved but not yet visible/scored;
- locked and awaiting results;
- scored;
- weekends or sessions with no prediction.

### 10.3 Profile identity rules

- Display name: 1–50 characters when set.
- Username: 3–30 characters.
- Username characters: lowercase letters, numbers, underscores, and hyphens.
- Usernames must be unique.
- Changing a username breaks existing profile links.
- A username can be changed at most once every 90 days.
- The UI requires explicit confirmation before a username change.
- Authentication identity, email, and avatar originate from Clerk; the in-app
  profile stores the product-facing identity and preferences.

## 11. Social graph, feed, and reactions

### 11.1 Following

An authenticated player can follow or unfollow another player.

Rules:

- a player cannot follow themselves;
- following the same player is idempotent from the user's perspective;
- a user may follow up to 5,000 players;
- public follower and following lists are available through profile routes but
  require sign-in to view their contents;
- suggested players may be derived from shared league membership.

### 11.2 Personalized feed

The feed requires authentication and combines relevant activity from followed
players and shared leagues. Feed events include implemented event types such as:

- a session locking with picks now revealable;
- a score/result being published;
- a player joining an eligible league.

Feed items can include race/session context, picks, score breakdowns, player
identity, league context, and reactions as appropriate. The feed supports
pagination and empty/loading states.

Private league activity must not become visible outside its authorized
membership context.

### 11.3 League feed

League members can view a feed scoped to their league. Non-members cannot query
the private member feed.

### 11.4 Reactions

Reactions are lightweight responses to a feed event. The supported set is:

- 🔥 Great pick;
- 👏 Nice one;
- 🤯 Wow;
- 😂 Funny;
- 🫣 Oof.

- Authenticated users can add one reaction, change it, or remove it.
- Feed items show an aggregate count and the most-used reaction emoji.
- The event detail page groups participants by reaction.
- Receiving reactions can generate grouped in-app notifications and, when
  enabled, push notifications.
- Feed events that no longer exist or are no longer available show a safe
  unavailable state.

## 12. Leagues

### 12.1 League types

**Private league**

- discoverable primarily by its direct link;
- may be open or protected by a password;
- can be created by free or Season Pass players within limits.

**Public league**

- listed in league discovery and searchable by name/description;
- cannot have a password;
- can only be created by a player with a Season Pass for that season.

Visibility is immutable after creation.

### 12.2 League fields and validation

- Name: required, 1–50 characters.
- Slug: required, unique, 3–30 characters.
- Slug characters: lowercase alphanumeric characters and internal hyphens;
  reserved slugs are rejected.
- Description: optional, maximum 200 characters.
- Visibility: private or public.
- Private-league password: optional, 1–50 characters when set.
- Season: associated with the relevant configured/default season.
- Maximum membership: 5,000 members.

Passwords must be stored as secure hashes, not plaintext.

### 12.3 Plan limits per season

| Capability              | Free | Season Pass |
| ----------------------- | ---: | ----------: |
| Private leagues created |    5 |          50 |
| Private leagues joined  |    5 |   Unlimited |
| Public leagues created  |    0 |           5 |
| Public leagues joined   |    5 |   Unlimited |

Creation and membership counters are separated by visibility and season. A
player who reaches a limit is shown their usage and directed to pricing where
an upgrade is applicable.

### 12.4 Joining

- Joining requires authentication.
- Public leagues can be joined directly within the player's plan limit.
- A password-protected private league requires the correct password.
- After five failed password attempts within 15 minutes, the player/league pair
  is locked out for 15 minutes.
- Existing membership should not be duplicated.
- A full league rejects additional members.

### 12.5 Member experience

Members can:

- view league standings;
- view the league feed;
- view the member roster and roles;
- copy an invitation link;
- share an invitation through X;
- leave the league, subject to admin continuity rules.

### 12.6 Administration and continuity

- A league must retain an administrator while it has members.
- The last administrator cannot leave a multi-member league until another
  member is promoted.
- Administrators can promote members, demote eligible administrators, and
  remove members.
- Deleting a league permanently removes the league and its memberships and
  requires a destructive-action confirmation using the league slug.
- League deletion is irreversible from the product UI.

## 13. Notifications

### 13.1 In-app notifications

In-app notifications are always represented in the notification bell for
authenticated players and include:

- results and scores published;
- results/scores amended;
- session locked when the player has picks;
- reactions received, grouped where applicable.

Players can mark individual notifications or all notifications as read.
Notification links lead to the relevant race, session, or feed event.

### 13.2 Web push notifications

Where supported by the browser/device, a player can enable push for that device
and independently configure:

- prediction reminders;
- picks-lock-soon reminders;
- results and scores;
- session locked;
- reactions to posts.

Disabling push access removes the subscription for the current device only.
Browser-denied permission must be explained without repeatedly prompting.

The scheduling implementation includes:

- a 24-hour prediction reminder;
- a 2-hour picks-lock reminder for players who have not predicted;
- H2H completion nudges where eligible;
- result and social notifications.

Delivery is best-effort. A scheduled or queued notification is not a guarantee
that an external email or push provider will deliver it.

### 13.3 Email notifications

Players can independently configure:

- prediction reminders, normally sent 24 hours before the first relevant lock
  and suppressed when the player has already predicted;
- results and score emails when a session is published.

Email times use the timezone and time-format preferences stored in Regional
settings.

## 14. Settings and support

### 14.1 Settings

The authenticated settings page contains:

- **Profile:** display name and username editing.
- **Season Pass:** current-season entitlement and link to pricing or leagues.
- **Regional:** email timezone and 12/24-hour locale preference.
- **Notifications:** in-app information, per-device push subscription/settings,
  and email preferences.

Signed-out users receive a sign-in-required state rather than editable settings.

### 14.2 Support

Authenticated players can submit a support request containing:

- subject, required, maximum 200 characters;
- optional category: bug, question, or feedback;
- message, required, maximum 5,000 characters.

The support flow associates the request with the authenticated account and
shows success, validation, loading, and failure states. Users are instructed
not to submit sensitive personal information.

## 15. Season Pass and billing

### 15.1 Offer

- Product: Season Pass for one named F1 season.
- Current implemented season: 2026.
- Standard implemented price: USD 19.99.
- Purchase is one-time for the season, not a recurring subscription.
- Entitlement unlocks expanded league access only; the prediction game and
  core leaderboards remain free.

Promotions may temporarily alter the checkout price. Time-limited campaign
copy, coupons, dates, and prices are operational configuration and must be
revalidated before reuse.

### 15.2 Checkout

- A player must be authenticated to purchase.
- Checkout is created through a server endpoint and completed through Paddle.
- The backend verifies billing webhooks and records the season entitlement.
- Successful purchase returns the player to Settings with confirmation.
- Cancelled and failed checkout states allow retry.
- Replayed webhook events must not create duplicate entitlements.

### 15.3 Refunds

The public refund-policy page defines the applicable refund terms and contact
route. Product and support copy must not promise terms that differ from that
page or Paddle's applicable checkout disclosures.

## 16. Sharing and discoverability

### 16.1 Shareable content

The app supports sharing:

- league invitation links;
- player profile links;
- race/session picks;
- Top 5 results and scores;
- H2H picks, results, and scores.

Share URLs can produce server-rendered metadata and Open Graph images tailored
to the shared variant. Sensitive pre-lock picks must never be embedded in a
public share card before they are eligible for disclosure.

### 16.2 Search engine behavior

Public marketing, race calendar, race detail, leaderboard, pricing, and public
profile content use page-specific titles, descriptions, canonical URLs, and
structured data where implemented.

Authenticated, operational, duplicate, or low-value pages, such as settings,
support, admin, and follower-list child pages, should be marked non-indexable as
implemented. The sitemap should contain only intended public canonical routes.

## 17. Navigation and responsive behavior

Primary navigation provides access, as appropriate, to:

- Home;
- Races;
- Leaderboard;
- Feed;
- Leagues;
- the next-race picks shortcut;
- notifications;
- profile/history;
- settings;
- sign-in/account controls;
- Admin for authorized users.

Navigation adapts to desktop and mobile widths. Core prediction, leaderboard,
feed, league, profile, pricing, settings, and support flows must remain usable
on narrow mobile web viewports.

The app also provides:

- a global offline banner when connectivity is lost;
- an announcement banner when an active announcement is configured;
- loading and error boundaries;
- a footer with support, terms, privacy, and related links;
- cookie/privacy choice controls where required.

## 18. Admin operations

### 18.1 Race configuration

Administrators can manage:

- season and round;
- race name and slug;
- location/country metadata;
- sprint-weekend status;
- prediction availability and per-session timing;
- overall race status.

Changes to timing must keep future reminder and lock scheduling consistent.

### 18.2 Results workflow

For each supported session, administrators can:

1. enter an ordered classification;
2. save/update a draft or configured result state;
3. publish results;
4. trigger Top 5 and H2H scoring;
5. trigger feed and notification effects;
6. amend published results with an explanatory note where supported;
7. roll back results and associated derived feed/score state where supported.

Results should be published in weekend order. Publishing a later session while
an earlier required session is missing is rejected or blocked.

### 18.3 Announcements and users

The admin console exposes tools for:

- creating and managing the active announcement banner;
- viewing user and prediction-completion information;
- checking Top 5 and H2H completion by required session.

### 18.4 Test scenarios

Non-production scenario tooling may modify the effective clock or seed product
states for deterministic testing. Such controls must be hidden and unavailable
in production.

## 19. Analytics

The web app records product analytics for important events, including examples
such as:

- prediction and H2H submission success/failure;
- draft discard;
- league creation, joining, and invitation sharing;
- following and feed interaction;
- reaction added, changed, and removed;
- notification opening/read state;
- checkout start, redirect, success, cancellation, and failure.

Analytics must:

- avoid including prediction data or personal data unnecessarily;
- use stable event names and documented properties;
- respect applicable consent/privacy choices;
- never be treated as the authoritative source for scores, billing entitlement,
  or membership.

## 20. Error, empty, and transitional states

Every data-backed surface must handle:

- initial loading;
- empty data;
- signed-out access;
- unauthorized access;
- not found;
- offline or transient network failure;
- server validation failure;
- stale client state after a deadline or administrative change;
- successful completion feedback.

High-value expected messages include:

- race, player, league, or feed item not found;
- sign in required;
- predictions not open for this race;
- session or all sessions locked;
- exactly five unique drivers required;
- Top 5 required before H2H;
- incorrect league password or temporary lockout;
- plan league limit reached;
- last league admin cannot leave;
- username unavailable or in cooldown;
- checkout cancelled or unavailable.

Client-side checks improve usability but do not replace backend validation.

## 21. Accessibility requirements

The implemented UI should maintain:

- semantic headings and landmarks;
- keyboard-operable navigation, forms, tabs, dialogs, and prediction controls;
- visible focus states;
- accessible names for icon-only controls;
- associated form labels and useful validation messages;
- `aria-live` feedback for asynchronous save, error, and success states;
- non-color indicators for selected, locked, scored, and error states;
- dialog focus management and escape/cancel behavior;
- reasonable contrast in light/dark themes where supported;
- reduced-motion behavior for nonessential animations when requested by the
  operating system.

Drag-based prediction or result ordering must have an equivalent pointer/tap or
keyboard-accessible interaction.

## 22. Privacy and security requirements

- Authentication is provided by Clerk and authenticated backend calls use
  server-verified identity.
- Authorization is enforced in Convex functions and server routes.
- Users cannot pass an arbitrary identity to gain access to another user's
  authenticated data or actions.
- Picks remain private before the applicable lock.
- Private league feeds and management data are restricted to eligible members
  or administrators.
- League passwords are hashed and join attempts are rate-limited.
- Billing webhook authenticity is verified before entitlement changes.
- Support submissions have bounded fields and are associated with the
  authenticated account.
- Public profiles and leaderboards follow the pre-lock disclosure rules.
- Legal pages describe data handling, terms, and refund policy.
- Account deletion initiated through the identity/account system must trigger
  the backend deletion workflow so product data and league ownership are safely
  cleaned up or transferred.

## 23. Reliability and performance expectations

- Public landing, race, profile, and leaderboard pages support server rendering
  and meaningful metadata.
- The home page obtains its primary display data in a consolidated request and
  retries transient failures.
- Convex subscriptions keep active authenticated views current without manual
  refresh where used.
- Long feeds and season leaderboards paginate instead of loading unbounded
  histories.
- Duplicate score publication, billing webhook, follow, membership, and
  reaction actions should be idempotent or safely rejected.
- Derived scores, standings, feeds, and notifications must remain reconcilable
  after result amendment or rollback.
- The service worker and offline UI must not present stale data as a confirmed
  successful prediction save.

## 24. Legal and brand constraints

- Grand Prix Picks is fan-made and is not represented as an official Formula 1
  product.
- The product must not imply gambling, real-money wagering, or guaranteed
  prizes.
- Terms, privacy, refund, and cookie controls remain reachable from public
  navigation/footer surfaces.
- Driver, team, race, and championship references must follow applicable brand
  and data-use constraints.

## 25. Route-level product inventory

| Route                     | Audience      | Primary purpose                                       |
| ------------------------- | ------------- | ----------------------------------------------------- |
| `/`                       | Public/player | Signed-out landing or authenticated race-weekend home |
| `/races`                  | Public        | Season calendar and race-state navigation             |
| `/races/:raceSlug`        | Public/player | Picks, H2H, results, scores, recap, sharing           |
| `/leaderboard`            | Public/player | Weekend/season, Combined/Top 5/H2H rankings           |
| `/feed`                   | Player        | Personalized friends-and-leagues activity             |
| `/feed/:feedEventId`      | Player        | Feed item detail and reaction participants            |
| `/leagues`                | Public/player | My leagues, usage, public discovery                   |
| `/leagues/create`         | Player        | Create private/public league within entitlement       |
| `/leagues/:slug`          | Public/player | League summary, join flow, member experience          |
| `/leagues/:slug/settings` | Member/admin  | League settings and administration                    |
| `/p/:username`            | Public        | Player identity, stats, eligible history/activity     |
| `/p/:username/followers`  | Player        | Followers list                                        |
| `/p/:username/following`  | Player        | Following list                                        |
| `/me`                     | Player        | Signed-in player's prediction history                 |
| `/settings`               | Player        | Profile, pass, regional, notification preferences     |
| `/pricing`                | Public/player | Season Pass offer and checkout entry                  |
| `/pay`                    | Player        | Purchase completion/checkout handoff support          |
| `/sign-in`                | Public        | Authentication entry/redirect                         |
| `/support`                | Player        | Authenticated support request                         |
| `/terms`                  | Public        | Terms of service                                      |
| `/privacy`                | Public        | Privacy policy                                        |
| `/refund-policy`          | Public        | Refund policy                                         |
| `/admin`                  | Site admin    | Race, announcement, user, and scenario operations     |
| `/admin/races/:raceId`    | Site admin    | Race/session result operations                        |

Server-only routes additionally handle Clerk and Paddle webhooks, Paddle
checkout creation, sitemap generation, X/social routing, and Open Graph image
generation.

## 26. Out of scope and non-goals

The current web product specification does not define:

- fantasy team budgets, constructors, transfers, or driver ownership;
- live timing or live race commentary;
- real-money wagering, pools, prizes, or payouts;
- user-authored feed posts or direct messaging;
- recurring subscriptions;
- cross-season Season Pass entitlement;
- native-mobile-only interaction details;
- official Formula 1 account, ticketing, or merchandise functionality.

## 27. Product acceptance checklist

A release should not be considered product-complete if any of the following
critical journeys fail:

1. A visitor can find the next race and build picks.
2. The visitor can sign in and save exactly five unique picks.
3. Saved picks can be revised before lock and cannot be revised after lock.
4. H2H picks require Top 5 and save for eligible sessions.
5. Published results produce correct Top 5, H2H, combined, weekend, and season
   scores.
6. Another player's picks are not exposed before lock.
7. Public and following leaderboards show only eligible published data.
8. A free player can create/join leagues only within the documented limits.
9. A Season Pass purchase grants the correct season entitlement exactly once.
10. Private league content and admin operations reject unauthorized users.
11. Result amendments update derived scores and notify affected users correctly.
12. Profile, feed, notification, settings, and support flows handle signed-out,
    loading, empty, and error states.
13. Core journeys work with keyboard input and at supported mobile web widths.

## 28. Maintenance notes

Review this document when any of the following change:

- active F1 season or session model;
- Top 5 or H2H scoring;
- prediction opening or lock rules;
- leaderboard eligibility or privacy;
- league limits, roles, or visibility;
- Season Pass price, duration, or benefits;
- notification types or timing;
- route inventory;
- administrative result workflow;
- identity, billing, analytics, or hosting provider.

Season-specific prices, promotion codes, campaign dates, calendar content, and
operational provider details should be treated as volatile configuration even
when they are currently present in source code.
