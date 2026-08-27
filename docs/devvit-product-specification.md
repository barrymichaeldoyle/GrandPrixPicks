# Grand Prix Picks for Reddit: Product Specification

**Status:** Shelved 27 August 2026. No code in the tree.  
**Product type:** Reddit Devvit interactive-post app  
**Working name:** Grand Prix Picks for Reddit  
**Specification version:** 0.1  
**Prepared:** 24 July 2026  
**Parent product:** [Grand Prix Picks](https://grandprixpicks.com)

> **Shelved.** The `apps/reddit` Devvit prototype was deleted on 27 August 2026:
> it was never finished, never playtested on Reddit, and the usage model was
> never thought through, so it was carrying CI, lint, dependency and audit cost
> for nothing. This specification is kept deliberately, as the thinking to pick
> back up from when there is capacity for it.
>
> The prototype's last state is in git history at `99ec750` (`apps/reddit`, plus
> `docs/reddit-app-handover.md` for the build/playtest notes):
> `git show 99ec750:apps/reddit/devvit.json`, or
> `git log --diff-filter=D --stat -1 -- apps/reddit` to find the deletion commit.
>
> Nothing here describes shipped behaviour. Reddit as a _distribution channel_
> (the `/r` share redirect, u/GrandPrixPicks, r/GPPicks) is unrelated, still
> live, and unaffected by this.

## 1. Executive summary

Grand Prix Picks for Reddit is a lightweight, Reddit-native Formula 1
prediction game. A subreddit installs the Devvit app and publishes an
interactive prediction post for each Grand Prix weekend. Redditors make Top 5
and teammate Head-to-Head picks inside the post, return for results, and compete
on a subreddit leaderboard.

The product adapts the proven Grand Prix Picks game loop to Reddit rather than
embedding the full web application. Its primary business purpose is product
discovery: let Redditors experience the game with minimal friction, create
visible community activity around each race, and give engaged players a
relevant path to the full Grand Prix Picks product.

The MVP is a standalone Reddit game:

- Reddit identity is the player identity.
- Each subreddit installation is its own competition.
- No Grand Prix Picks account is required.
- Reddit scores do not initially merge with web scores.
- Account linking is explicitly deferred.
- No payment or Season Pass upsell appears inside the core play loop.

## 2. Product thesis

Formula 1 discussion already happens around recurring, time-sensitive race
weekends. A prediction game is naturally compatible with that behavior:

1. moderators add the app to an F1 community;
2. the app creates a recognizable prediction post before each weekend;
3. Redditors make picks without leaving Reddit;
4. picks lock as sessions start;
5. the same post becomes a results and leaderboard destination;
6. comments, shares, and repeat weekends grow community awareness;
7. players who want deeper features discover Grand Prix Picks.

The Reddit app succeeds only if it is valuable to the subreddit on its own. It
must not feel like an advertisement with a thin interaction attached.

## 3. Goals and non-goals

### 3.1 Product goals

1. Deliver a complete, enjoyable F1 prediction loop inside a Reddit post.
2. Give moderators a low-maintenance recurring community feature.
3. Encourage repeat play across race weekends.
4. create subreddit-specific competition and conversation.
5. Build awareness of the Grand Prix Picks name and game mechanics.
6. Convert a measured subset of engaged Reddit players into visitors to the
   main web product.
7. Validate whether Reddit can become a repeatable acquisition channel.

### 3.2 MVP non-goals

- Reproducing every feature of the web app.
- Sharing one account or score between Reddit and the web app.
- Running cross-subreddit global standings.
- Selling a Season Pass or other purchase inside Reddit.
- Replacing race threads, live timing, fantasy F1, or moderation tools.
- Requiring comments, upvotes, subscriptions, or outbound clicks to play.
- Creating user-authored posts or comments on a player's behalf.
- Supporting private leagues, follows, feeds, notifications, or public player
  profiles from the main product.

## 4. Success measures

### 4.1 North-star metric

**Returning weekend players:** unique Reddit users who submit valid picks in at
least two separate Grand Prix weekends during a rolling season window.

This measures whether the app becomes a habit rather than a one-post novelty.

### 4.2 Product metrics

Per installation and in aggregate where platform reporting permits:

- prediction-post impressions;
- app/session starts;
- unique players;
- Top 5 draft starts;
- valid Top 5 submissions;
- H2H submissions;
- completion rate from app open to saved Top 5;
- percentage completing both Top 5 and H2H;
- returning players;
- results-view return rate;
- leaderboard views;
- average weekends played per player;
- comment and share activity on prediction posts;
- app installs and active subreddit installations;
- moderator retention across three race weekends.

### 4.3 Acquisition metrics

- outbound clicks to Grand Prix Picks;
- click-through rate by placement and lifecycle state;
- landing-page sign-ups attributable to Reddit UTM parameters;
- new web players who identify Reddit as their source;
- downstream web prediction completion.

The app must not send Reddit usernames or other identifying Reddit data to the
web analytics system merely to improve attribution.

### 4.4 Initial MVP targets

Targets should be finalized after a private beta establishes realistic
baselines. Suggested validation thresholds:

- at least 30% of players who open the game submit Top 5 picks;
- at least 25% of first-weekend players return for another weekend;
- at least 50 valid players in one target-community weekend;
- at least 3 moderator teams retain the app for three weekends;
- no more than 1% of saves produce unhandled errors;
- no confirmed pre-lock pick leaks.

## 5. Audiences and roles

### 5.1 Logged-out visitor

A logged-out visitor can:

- see the custom post's launch/preview state;
- understand what the game is;
- view public results or a limited leaderboard where supported;
- be asked to log in to Reddit before submitting.

They cannot save picks because a stable Reddit user identity is required.

### 5.2 Reddit player

A logged-in Redditor can:

- make and revise eligible picks;
- view their saved picks;
- see results and scoring after publication;
- appear on the subreddit leaderboard;
- inspect their weekend and season performance within that installation;
- follow an outbound link to the full Grand Prix Picks product.

### 5.3 Subreddit moderator

A moderator can:

- install the approved app;
- configure the installation;
- create or schedule the community prediction post;
- choose allowed branding/copy options;
- enable or disable H2H for that community;
- inspect app status and sync freshness;
- trigger documented recovery actions;
- remove or uninstall the experience through Reddit controls.

Moderators do not edit individual player picks or scores.

### 5.4 Grand Prix Picks operator

An authorized operator can:

- prepare the canonical season, race, driver, matchup, timing, and result data
  used by the Reddit product;
- monitor data synchronization and scoring;
- correct or amend results;
- provide moderator and player support;
- publish reviewed app versions.

Operator access must not depend on publicly exposed client controls.

## 6. Core game model

The Reddit game deliberately uses the same recognizable mechanics as the main
product.

### 6.1 Sessions

A regular weekend supports:

1. Qualifying
2. Race

A sprint weekend supports:

1. Sprint Qualifying
2. Sprint
3. Qualifying
4. Race

Practice sessions are outside the game.

### 6.2 Top 5 picks

For each supported session, the player ranks exactly five unique drivers in
predicted finishing order.

Scoring:

| Outcome                                                               | Points |
| --------------------------------------------------------------------- | -----: |
| Exact predicted position in the top five                              |      5 |
| Actual finish is one place from the predicted position                |      3 |
| Driver finishes in the actual top five but is two or more places away |      1 |
| Otherwise                                                             |      0 |

Maximum Top 5 score: 25 points per session.

The Reddit implementation must share the same tested scoring definition as the
main product, including the existing one-position-away behavior.

### 6.3 H2H picks

For each configured teammate matchup, the player selects the driver expected to
finish ahead in the session.

- Each correct selection earns 1 point.
- An incorrect or unscorable matchup earns 0 points.
- H2H is presented after Top 5 to preserve a short primary flow.
- A moderator may disable H2H for the installation if a simpler experience is
  preferred.

### 6.4 Combined score

The default leaderboard ranks by:

`combined points = Top 5 points + H2H points`

Top 5 and H2H breakdowns remain visible in results. Tie-breaking is defined in
section 12.

### 6.5 Locking and privacy

- Every session locks at its configured scheduled start.
- Players may revise that session until lock.
- Server time is authoritative.
- A client open before lock cannot save after the deadline.
- A player can always see their own saved picks.
- Other players' picks are hidden until the relevant session locks.
- Leaderboards based on results remain unavailable until results are published.
- The post must never reveal participation or picks in a way that facilitates
  copying before lock.

## 7. Reddit-native experience

### 7.1 Custom post

The core surface is a Devvit custom post rendered in a Reddit webview. A race
weekend normally has one canonical post per subreddit installation.

The post changes with the weekend lifecycle:

1. **Open:** play CTA, deadline, session progress, community player count.
2. **Partially locked:** results/picks for earlier sessions and open picks for
   later sessions.
3. **Awaiting results:** saved picks and results-pending state.
4. **Scored:** personal score, community leaderboard, recap, next-race prompt.
5. **Season idle:** next-event information or season summary.

The post title should be clear and searchable, for example:

> 2026 Belgian GP Predictions: Pick the Top 5

### 7.2 Launch screen

The collapsed or initial experience communicates:

- race name and flag/venue treatment;
- next session and lock countdown;
- “Make your picks” or “View results” primary action;
- number of community players, when safe to display;
- Grand Prix Picks branding;
- concise text fallback for clients that cannot render the experience.

### 7.3 First-open onboarding

First-time players see no more than three short concepts:

1. Rank your Top 5.
2. Pick teammate winners.
3. Earn points and climb this community's leaderboard.

They can immediately continue. There is no account-creation wall beyond being
logged into Reddit.

### 7.4 Top 5 interaction

Preferred flow:

1. Choose a session.
2. Add drivers into positions 1–5.
3. Reorder or replace selections.
4. Review the deadline.
5. Save.
6. Receive unmistakable saved confirmation.

Requirements:

- prevent duplicate drivers;
- show team/driver identifiers clearly without relying only on color;
- allow touch, pointer, and keyboard-compatible selection;
- preserve an in-progress browser draft where practical;
- revalidate on the server;
- show the saved timestamp and deadline;
- make revision behavior clear.

### 7.5 H2H interaction

After Top 5 is saved:

1. show one teammate pairing at a time or a compact matchup list;
2. allow one selection per matchup;
3. show progress;
4. save once complete;
5. allow revision before lock.

The user may skip H2H and still have a valid Top 5 entry.

### 7.6 Results experience

After publication, the post shows:

- personal Top 5 points;
- personal H2H points;
- combined session/weekend total;
- predicted versus actual Top 5;
- per-pick points;
- correct/incorrect H2H matchups;
- community rank;
- movement or milestone copy where it is accurate;
- a route to the community leaderboard.

An amended-result state explains that scores were recalculated and shows the
latest result as authoritative.

### 7.7 Community leaderboard

The default view contains:

- player rank;
- Reddit display identity;
- combined points;
- Top 5 and H2H totals;
- weekends played;
- the current viewer highlighted.

Filters:

- current race weekend;
- season;
- Combined;
- Top 5;
- H2H.

The MVP leaderboard is scoped to the subreddit installation.

### 7.8 Comments and Reddit actions

Comments remain Reddit's native discussion layer beneath the app post.

The app may invite discussion with copy such as “Who was your boldest pick?”,
but:

- commenting is never required to save or score;
- the app does not automatically post a player's picks;
- posting or commenting as the user requires a separate, explicit action;
- upvoting, joining the subreddit, sharing, or following any account is never a
  condition of gameplay or reward.

## 8. Discovery and conversion design

### 8.1 Brand relationship

The app is clearly presented as:

> Grand Prix Picks for Reddit, a community edition of GrandPrixPicks.com

It must also state that it is fan-made and not affiliated with Formula 1 or
Reddit.

### 8.2 Conversion principle

The full web product is offered when it solves a limitation the player has
already experienced. The app must not interrupt initial picks with an outbound
promotion.

### 8.3 Allowed conversion moments

Proposed placements:

- **After a successful save:** low-emphasis text link: “Want global rankings,
  friends and private leagues? Play the full game.”
- **After results:** contextual card comparing community play with the full
  season experience.
- **Season leaderboard footer:** “Compete beyond this subreddit.”
- **About/help:** clear permanent link to Grand Prix Picks.

Do not place the outbound CTA above the primary play action.

### 8.4 Landing behavior

Outbound links use a dedicated Reddit landing route on the main site, proposed:

`https://grandprixpicks.com/reddit`

The landing page should:

- acknowledge the Reddit handoff;
- explain the additional value: global and following leaderboards, leagues,
  profiles, activity feed, notifications, history, and cross-device access;
- show the current race;
- let visitors start picks before sign-in;
- avoid claiming their Reddit picks or score will transfer;
- carry campaign and subreddit-level attribution only where policy permits.

Suggested UTM shape:

`utm_source=reddit&utm_medium=devvit&utm_campaign={season}_{raceSlug}&utm_content={placement}`

Do not include a Reddit username or user ID in the URL.

### 8.5 No account-linking promise in MVP

The MVP explicitly states:

> Reddit picks and Grand Prix Picks website picks are separate.

This prevents users from assuming scores or entries transfer between products.

## 9. Moderator experience

### 9.1 Installation

The app is distributed through Reddit's app review and directory flow.
Installation is initiated by a moderator for a subreddit they manage.

The listing explains:

- what posts the app creates;
- what moderator permissions it needs;
- what data it stores;
- whether it contacts an external service;
- support and removal instructions;
- terms and privacy links.

### 9.2 Installation settings

Proposed settings:

- enable/disable automatic race posts;
- post creation lead time, with safe preset choices;
- H2H enabled;
- default leaderboard mode;
- post flair ID, optional;
- sticky post after creation, only if Reddit permissions and policy allow;
- custom intro line, bounded and moderator-authored;
- results-comment behavior, off by default;
- support/contact preference.

The app owns scoring rules. Moderators cannot alter points or deadlines, which
keeps competitions consistent and supportable.

### 9.3 Post creation

MVP options:

- moderator creates the next race post using a subreddit menu action; and/or
- the app creates it from a scheduled task when auto-posting is enabled.

Creation must be idempotent: there can be only one canonical app post per race,
installation, and configured edition. Retrying after an error must not create
duplicates.

### 9.4 Moderator status

A status view reports:

- installed app version;
- current configured season/race;
- last data refresh;
- canonical post ID and URL;
- number of players;
- lock and result state;
- last scheduler success/failure;
- recovery action where available;
- support link.

### 9.5 Uninstall and data

Documentation explains what happens to:

- existing custom posts;
- stored picks and leaderboards;
- scheduled jobs;
- installation-scoped Redis data;
- any externally synchronized data.

Player deletion requests and Reddit content deletion events must be honored
according to current Devvit policy.

## 10. Data and system model

### 10.1 Installation boundary

Devvit Redis is scoped per app installation. Therefore:

- player picks and subreddit leaderboards are stored per installation;
- one subreddit cannot directly query another installation's data;
- the MVP does not promise cross-subreddit standings;
- season/race reference data must be replicated safely to each installation or
  packaged with the app.

### 10.2 Conceptual entities

**Installation configuration**

- subreddit/install identifier;
- feature flags;
- post settings;
- current schema/app version.

**Race**

- season, round, slug, name;
- venue/country presentation;
- sprint flag;
- session lock times;
- status and source revision.

**Driver**

- stable driver key;
- display name, short code, team;
- active season.

**H2H matchup**

- stable matchup key;
- season;
- two driver keys.

**Race post**

- race key;
- Reddit post ID;
- creation timestamp;
- lifecycle state.

**Player entry**

- installation-scoped Reddit user ID;
- race/session;
- five driver keys;
- saved timestamp and revision.

**H2H entry**

- installation-scoped Reddit user ID;
- race/session;
- selections;
- saved timestamp and revision.

**Result**

- race/session;
- ordered classification;
- source revision;
- publication/amendment timestamp.

**Score**

- player, race, session;
- Top 5 total and breakdown;
- H2H total and breakdown;
- score revision.

**Standing**

- player;
- weekend/season totals;
- mode-specific totals;
- weekends played;
- deterministic ranking value.

### 10.3 Data minimization

Store only what the Reddit experience needs:

- prefer the stable Reddit user ID as the internal key;
- fetch/display the current public username when needed;
- do not store email, real name, private profile data, votes, subscriptions, or
  browsing history;
- do not export identifying Reddit data to Grand Prix Picks systems in MVP;
- cap and expire ephemeral drafts, locks, and operational logs;
- document retention and deletion behavior.

## 11. Canonical race data strategy

This is the primary technical/product decision before implementation.

### 11.1 Recommended MVP strategy

Use Devvit-hosted server code and installation Redis for gameplay. Treat a
reviewed, versioned race-data bundle as the initial source for:

- calendar;
- drivers and teams;
- matchups;
- session timestamps.

Operators publish results through a controlled Reddit-app operator flow or
through a later approved synchronization mechanism.

Why:

- it avoids account linking;
- it minimizes outbound data;
- it allows playtesting before external-fetch approval;
- it keeps the app useful if the main web service is unavailable.

Tradeoff: calendar changes and results need an explicit update workflow.

### 11.2 Preferred production evolution

After policy review, allow the Devvit server to obtain non-personal canonical
race configuration and results from an approved endpoint. The client calls only
the Devvit app's own `/api/` routes; the Devvit server performs any approved
external fetch.

Requirements:

- exact HTTPS domain approval;
- no Reddit identity in the request;
- signed/versioned payloads or equivalent integrity controls;
- timeout, cache, retry, and stale-data behavior;
- installation-local cached copy;
- terms and privacy disclosures;
- a manual recovery path.

Current Devvit HTTP-fetch policy does not generally approve arbitrary personal
domains merely because an app already uses them. Approval is a launch risk, not
an assumed capability.

### 11.3 External push alternative

Devvit external endpoints could allow a trusted system to push race changes or
results into installations, but this capability is limited-access and must not
be an MVP dependency until Reddit grants access and the per-installation routing
model is proven.

## 12. Ranking and tie-breaking

For a selected scope and mode, rank by:

1. highest applicable points;
2. most exact Top 5 position hits;
3. most correct H2H picks;
4. fewer scored sessions needed to reach the total;
5. earliest first valid submission for the selected scope;
6. stable Reddit user ID ordering as the final deterministic fallback.

Tie-breakers must be displayed in help copy before they are competitively
significant. If the main web product uses a different tie policy, the Reddit
edition must label its own policy rather than implying the rankings merge.

## 13. Lifecycle and scheduling

### 13.1 Before a race

- Reference data is present and validated.
- The race post is created at the configured lead time.
- All eligible sessions are visible.
- Players may submit while sessions are open.
- Countdown uses server-authoritative timestamps.

### 13.2 At session lock

A scheduled job or request-time check:

- marks the session locked;
- rejects late writes;
- allows submitted picks to become visible where the UI exposes them;
- updates the post state;
- remains safe if executed more than once.

Request-time validation is mandatory even when the scheduled task is delayed.

### 13.3 At result publication

- Validate the classification.
- Store a monotonically increasing result revision.
- Score all eligible entries idempotently.
- Materialize/update standings.
- change the post to the scored state.
- optionally add one app-authored results comment if enabled and policy-safe.

### 13.4 At amendment

- Preserve an audit reference to the prior result revision.
- Recalculate affected scores and standings.
- Mark the experience as amended.
- Do not double-count a session.
- Explain material changes to users.

### 13.5 Between races

- Highlight the season leaderboard.
- Link to the next race when configured.
- Keep completed posts readable.
- prune only ephemeral operational data, not season standings.

## 14. Error and recovery behavior

All core surfaces support:

- logged-out;
- loading;
- no active race;
- draft;
- saving;
- saved;
- validation error;
- session locked during save;
- results pending;
- scored;
- amended;
- offline/network failure;
- stale reference data;
- unavailable app service;
- deleted/unavailable post.

Critical error messages:

- “Log in to Reddit to save your picks.”
- “Pick exactly five different drivers.”
- “This session has locked. Your changes were not saved.”
- “Your picks are saved.”
- “Results are not available yet.”
- “We couldn't load the game. Try again.”
- “Race data is temporarily out of date. Saving is paused.”

Never show a success state until the server confirms the write.

## 15. Accessibility and responsive design

The app must work inside Reddit's constrained post webview on supported mobile
and desktop clients.

Requirements:

- touch targets appropriate for mobile;
- no horizontal scrolling for the core flow;
- keyboard-operable selection and reordering;
- semantic controls and headings;
- visible focus;
- labeled icon-only buttons;
- accessible live feedback for saves and errors;
- state conveyed by text/icon as well as color;
- reduced-motion support;
- light and dark Reddit theme compatibility;
- text fallback for unsupported custom-post clients;
- no essential information hidden behind hover.

Performance should favor a fast first interaction over rich animation.

## 16. Privacy, security, and policy requirements

### 16.1 Identity

- Use Devvit-provided authenticated context.
- Do not trust a client-supplied Reddit user ID.
- Authorize moderator/operator actions on the server.
- Do not expose internal tokens, secrets, or external endpoint credentials to
  the webview.

### 16.2 Picks

- Keep pre-lock picks private.
- Make writes idempotent by user/race/session.
- use server time for deadlines;
- validate driver and matchup membership server-side;
- version scoring so amendments can be reconciled.

### 16.3 Reddit policy

The app must:

- provide discrete value on Reddit;
- describe branding, data practices, and the relationship with Reddit honestly;
- not condition play on a post, comment, upvote, share, or subreddit join;
- keep user posting/commenting actions separate and explicit;
- honor Reddit content and user deletion requirements;
- supply its own terms and privacy policy when using HTTP fetch or other
  applicable premium/external capabilities;
- request approval before directing users externally or using external data
  collection in ways requiring review;
- avoid unlicensed third-party logos and trademarks.

### 16.4 Account linking

Account linking is deferred because current Devvit rules require, among other
things:

- explicit opt-in and unlinking;
- anonymized identity exchange using only a unique linkage ID;
- deletion of externally held user data after unlinking;
- read-only external account scopes;
- no external username/password authentication;
- an external service with SOC 2 Type II compliance;
- a recent accredited penetration test without unresolved high/critical
  findings.

No roadmap or marketing material should promise linked accounts until product,
legal, security, and Reddit review requirements are satisfied.

## 17. Analytics and experimentation

Use Devvit/Reddit-provided app analytics for interaction metrics wherever
possible. Installation-local analytics may store aggregate counters in Redis.

If external analytics is later approved:

- send aggregate or anonymized events only;
- never include Reddit username;
- avoid a stable cross-service user identifier in MVP;
- publish the collection purpose and retention;
- respect applicable consent and deletion;
- tolerate analytics failure without affecting gameplay.

Safe experiments include:

- onboarding copy;
- result-card ordering;
- placement/copy of the outbound product link;
- default Combined versus Top 5 leaderboard presentation;
- first-time H2H explanation.

Do not experiment with scoring, privacy, deadlines, or deceptive urgency.

## 18. MVP scope

### 18.1 Required

- Devvit Web custom post.
- Logged-in Reddit identity.
- One subreddit-scoped race post.
- Regular and sprint weekend session models.
- Top 5 picks and revisions.
- Optional H2H picks and revisions.
- Per-session locks.
- Result publication/amendment.
- Tested scoring parity with the main product.
- Personal result breakdown.
- Weekend and season subreddit leaderboards.
- Moderator-created post flow.
- Minimal installation settings.
- Grand Prix Picks brand/about link.
- Dedicated outbound landing route requirements.
- Terms, privacy, help, and support information.
- Loading, empty, error, and unsupported-client states.
- Accessibility and mobile-webview support.

### 18.2 Strongly preferred

- Automated post scheduler.
- Moderator status/health screen.
- Result synchronization through an approved non-personal-data mechanism.
- Community player count.
- Text fallback and external share image.
- Aggregate funnel analytics.

### 18.3 Deferred

- Account linking.
- Score transfer between Reddit and web.
- Cross-subreddit standings.
- Reddit-wide global leaderboard.
- Push/direct-message reminders.
- Native Reddit payments.
- Achievements, streaks, badges, or awards.
- Comment-based pick sharing.
- Public API for third parties.

## 19. Phased rollout

### Phase 0: Feasibility prototype

- Create a Devvit Web post in a private test subreddit.
- Validate mobile and desktop interaction.
- Verify Reddit identity, Redis storage, scheduling, and server-time locks.
- Implement one session with static drivers and local results.
- Confirm app-review interpretation for branding and outbound links.

Exit criteria: one complete prediction-to-result loop works without external
services.

### Phase 1: Private beta

- Full weekend session model.
- Top 5 and H2H.
- Subreddit leaderboard.
- Manual moderator post creation.
- Controlled result publication.
- Install in one owned/sandbox community and one cooperative small community.

Exit criteria: three consecutive race weekends with correct locks and scores.

### Phase 2: Reviewed public MVP

- Submit launch-ready app and documentation for Reddit review.
- Enable approved app-directory installation.
- Add moderator onboarding and support.
- Launch to a small set of opted-in F1 communities.
- Measure retention and moderator burden.

Exit criteria: success thresholds from section 4 are met or produce a clear
iteration decision.

### Phase 3: Scalable operations

- Approved canonical-data synchronization.
- Automated post creation.
- health monitoring and recovery;
- refined conversion landing page;
- broader moderator outreach.

### Phase 4: Optional connected product

Only after compliance/security feasibility:

- explicit account-linking consent;
- unlink/delete lifecycle;
- clearly defined score-transfer semantics;
- cross-platform identity and conflict handling;
- revised Reddit and Grand Prix Picks privacy/terms.

## 20. App review and launch readiness

Before public submission:

- use the current Devvit Web React template and supported APIs;
- provide a non-technical app README;
- provide example posts in a dedicated non-test subreddit;
- test developer, moderator, player, and logged-out roles;
- document all requested permissions and external domains;
- publish app-specific terms and privacy policy where required;
- document support and deletion paths;
- verify all external branding rights;
- test mobile Reddit, desktop Reddit, light/dark themes, and degraded fallback;
- confirm the app works without forcing external navigation;
- batch material releases because each published version is reviewed.

## 21. Risks and mitigations

| Risk                                              | Impact                          | Mitigation                                                         |
| ------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| External race-data domain is not approved         | Blocks automatic sync           | Ship a no-fetch prototype and controlled data bundle first         |
| Redis is isolated per subreddit                   | No simple global leaderboard    | Make subreddit competition the MVP value proposition               |
| Scheduler runs late or fails                      | Incorrect apparent lock state   | Enforce lock on every server write; make jobs idempotent           |
| Account linking is non-compliant or too expensive | Cannot merge users/scores       | Keep MVP standalone and make separation explicit                   |
| Moderator installation friction                   | Weak distribution               | Excellent listing, demo post, simple settings, direct mod outreach |
| App feels promotional                             | Review/community rejection      | Complete on-Reddit value; conversion only after success moments    |
| Result entry error                                | Incorrect scores and trust loss | Revisioned results, amendment workflow, deterministic rescoring    |
| Pre-lock pick leak                                | Competitive integrity failure   | Server-side visibility checks and dedicated adversarial tests      |
| F1 trademark/data concerns                        | Removal or legal risk           | Fan-made disclosure and reviewed brand/data usage                  |
| App update review delay                           | Slow fixes                      | Feature flags, tested releases, operational fallbacks              |
| Post webview limitations                          | Poor usability                  | Prototype on real Reddit clients before full build                 |

## 22. Acceptance criteria

The MVP is product-complete only when:

1. A moderator can create exactly one canonical post for a configured race.
2. A logged-in Redditor can save exactly five unique Top 5 picks.
3. The same Redditor can revise picks before lock.
4. A save after lock is rejected even if the client is stale.
5. Other players cannot inspect picks before the session locks.
6. H2H accepts only valid drivers from configured matchups.
7. Published results produce scoring identical to shared Grand Prix Picks test
   fixtures.
8. Republishing an amended result recalculates rather than duplicates scores.
9. Weekend and season subreddit leaderboards rank deterministically.
10. Logged-out and unsupported clients receive useful fallback content.
11. Core play works on supported Reddit mobile and desktop clients.
12. No gameplay step requires an upvote, comment, subscription, share, or
    outbound click.
13. Outbound links contain no Reddit identity and accurately explain that the
    products are separate.
14. Uninstall/deletion behavior, support, privacy, and terms are documented.
15. The app passes Reddit review for its requested capabilities.

## 23. Open product decisions

The following need explicit decisions before engineering scope is locked:

1. **Pilot community:** which subreddit can host the first real beta?
2. **Post owner:** should posts be created by the app account or through a
   moderator-confirmed action?
3. **Canonical data:** bundled/manual for beta, or wait for approved sync?
4. **H2H default:** on by default or opt-in per installation?
5. **Post cadence:** one weekend post or a separate post per session?
6. **Comment behavior:** should the app ever publish a results comment?
7. **Identity display:** full Reddit username or privacy-preserving shortened
   form on the leaderboard?
8. **Tie-breaking:** accept the proposed policy or mirror a future web policy?
9. **Conversion landing page:** build `/reddit` before beta or use the home
   page initially?
10. **Brand presentation:** use Grand Prix Picks directly or a community-edition
    sub-brand?
11. **Result operations:** who is on call to correct a bad classification
    during a live weekend?
12. **Data rights:** which official results source is permitted for this
    derivative experience?

## 24. Recommended decisions

For the smallest credible launch:

- use one post per race weekend;
- enable Top 5 and H2H, with H2H skippable;
- use Combined as the default leaderboard;
- keep all competition subreddit-scoped;
- create posts through a moderator action during beta;
- package calendar/driver/matchup data and manually publish results during beta;
- create `/reddit` before public launch, not before the prototype;
- show standard Reddit usernames on the in-subreddit board;
- publish no automatic user content and no results comment initially;
- call the app **Grand Prix Picks for Reddit**;
- defer account linking indefinitely until independently justified.

## 25. Platform references

This proposal was shaped by the current official Devvit documentation:

- [Devvit overview](https://developers.reddit.com/docs/)
- [Devvit Web](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview)
- [Creating a custom post](https://developers.reddit.com/docs/capabilities/creating_custom_post)
- [Redis and installation-scoped storage](https://developers.reddit.com/docs/capabilities/server/redis)
- [Scheduler](https://developers.reddit.com/docs/capabilities/server/scheduler)
- [HTTP Fetch](https://developers.reddit.com/docs/capabilities/http-fetch)
- [External endpoints](https://developers.reddit.com/docs/capabilities/server/external-endpoints)
- [Reddit API capability](https://developers.reddit.com/docs/capabilities/server/reddit-api)
- [Devvit rules and account-linking requirements](https://developers.reddit.com/docs/devvit_rules)
- [App launch guide](https://developers.reddit.com/docs/guides/launch/launch-guide)

Devvit is evolving. Platform capabilities and policy requirements must be
revalidated at the start of implementation and before every public submission.
