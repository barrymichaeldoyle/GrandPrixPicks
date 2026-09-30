# Discord server setup plan

Status: not started. Written 2026-09-27.

## Why this exists

Grand Prix Picks has about 45 users and no owned community space that works
(r/GPPicks is inactive, but stays: it may come back with automation later). The
Discord server has two jobs from day one, and everything else is secondary:

1. **Android beta.** Recruit testers, ship build notes, collect bugs. The Play
   developer account dates from 2017, so the 12-tester/14-day closed-test rule
   for new personal accounts does **not** apply. The beta exists to find
   Android bugs before production, not to clear a Play gate.
2. **TRMNL plugin.** One place for plugin users to report layout bugs and ask
   for features once the plugin is public.

Every news item is cross-posted automatically so the server has regular
activity between betas.

## Rules for whoever executes this

- Tasks are tagged **[Barry]** (needs his Discord, Google Play or Convex prod
  access) or **[Agent]** (repo work or drafting). An agent does not do [Barry]
  tasks; it prepares what he needs and stops.
- All player-facing copy follows `docs/product-voice.md`. No em dashes. No
  hashtags. No "join our community" framing: say what the channel is for.
- Keep the server small. Do not add channels, bots or roles beyond this plan.
- Do not put Discord in the header nav.
- Do not set secrets. Barry sets `DISCORD_NEWS_WEBHOOK_URL` himself.
- Do not commit or push unless Barry asks. Work on `main`.
- Where this plan and the code disagree, the code wins. Update this file.

## Phase 0: decisions (done 2026-09-27)

- Play developer account: created 2017. No tester minimum.
- News to Discord: **every news item**, race news and global news, when its
  feed card first appears.
- Footer: Discord **beside** the r/GPPicks link. Keep Reddit everywhere it is.
- Server name: Grand Prix Picks.

## Phase 1: create the server (Barry)

- [x] Create server: "Create My Own" > "For a club or community". Name it
      Grand Prix Picks. Icon: `apps/web/public/logo-storefront.png` (512x512).
- [x] Enable Community (Server Settings > Enable Community). This gives
      announcement channels, onboarding and a rules screen.
  - [x] Verification level: Medium (account registered for 5+ minutes).
  - [x] Explicit media filter: all members.
  - [x] Community updates channel: a private `#mod` channel (only Barry).
- [ ] Default notification setting: **Only @mentions**. News posts land
      several times a weekend, and some arrive after a session, so nobody
      should get a phone ping for them unless they opt in per channel.
      Couldn't find a server-wide default for new members in the current
      Discord UI (only a per-viewer preference, which already defaulted to
      Only @mentions when checked) — recheck manually.
- [x] Channels, in this order:

  | Category | Channel         | Type                 | Who can post    |
  | -------- | --------------- | -------------------- | --------------- |
  | Info     | #welcome        | Text (rules channel) | Barry only      |
  | Info     | #announcements  | Announcement         | Barry only      |
  | Info     | #news           | Announcement         | Webhook + Barry |
  | Testing  | #android-beta   | Text                 | Everyone        |
  | Testing  | #trmnl          | Text                 | Everyone        |
  | Chat     | #bugs-and-ideas | Forum                | Everyone        |
  | Chat     | #general        | Text                 | Everyone        |
  | (hidden) | #mod            | Text, private        | Barry only      |

  Created by renaming the defaults (#rules → #welcome, #moderator-only →
  #mod) so their permissions carried over, then adding the rest. Order
  within Info is #announcements/#mod/#welcome/#news, not the table order
  above — cosmetic only, drag-to-reorder didn't stick in the browser.

- [x] Forum tags on #bugs-and-ideas: `bug`, `idea`, `web`, `android`, `ios`,
      `trmnl`, `fixed`. Require a tag on new posts.
- [x] Roles: `Android beta`, `TRMNL`. Both pingable by Barry only. No other
      roles.
- [x] Permissions: `@everyone` cannot use `@everyone`/`@here` and cannot create
      invites, so the one permanent invite is the only one in circulation.
- [x] AutoMod: turn on the built-in spam, mention-spam and commonly flagged
      words rules. No moderation bots.
- [x] Onboarding (Server Settings > Onboarding): one multi-select question,
      "What are you here for?"
  - [x] Android beta testing: gives `Android beta`, shows #android-beta
  - [x] TRMNL plugin: gives `TRMNL`, shows #trmnl
  - [x] Playing Grand Prix Picks: shows #general and #bugs-and-ideas
  - [x] Default channels for everyone: #welcome, #announcements, #news, plus
        #general (Discord requires at least one default channel @everyone
        can post in; none of #welcome/#announcements/#news qualify since
        @everyone can't send there)
- [x] Permanent invite from #welcome: never expires, no use limit.
      `https://discord.gg/c7YHSNE4Te` — used directly for Phase 4 below.
      Deleted the two stray temporary invites so this is the only one live.
- [x] Webhooks (Server Settings > Integrations > Webhooks):
  - [x] "Grand Prix Picks News" on #news. For **prod**. (Avatar not set to
        the logo — no file upload path from browser automation; cosmetic,
        Barry can set it.)
  - [x] "News (dev)" on #mod. For **dev**, so dev news never reaches players.
- [x] Set the env vars (Barry set both `DISCORD_NEWS_WEBHOOK_URL`, dev and
      `--prod`, himself — not pasted into chat or the repo):

  ```sh
  cd apps/backend
  npx convex env set DISCORD_NEWS_WEBHOOK_URL '<dev webhook>'
  npx convex env set DISCORD_NEWS_WEBHOOK_URL '<prod webhook>' --prod
  ```

## Phase 2: server copy (Agent drafts, Barry pastes)

Tighten the drafts under "Copy drafts" below, following
`docs/product-voice.md`. Do not lengthen them. Check facts in the code before
writing: session names (`apps/web/src/lib/sessions.ts`), scoring
(`apps/backend/convex/lib/scoring.ts`), the TRMNL layout sizes
(`apps/trmnl/src/`), and "reactions" (not "revs").

- [x] Server description (invite preview, max 120 characters)
- [x] #welcome message: what the server is for, 4-5 rules, links to the site
      and the support email (`packages/shared/src/contact.ts`)
- [x] Channel topics for every channel
- [x] #android-beta pinned message: the Google Group and Play opt-in links
      from Phase 5 don't exist yet, so this posts as a "coming soon" interest
      check instead — react to get pinged when builds land. The bug-report
      pin is written but unpinned until the beta actually opens; swap them
      when it does.
- [x] #trmnl pinned message: how to install, what to include in a report
- [x] #bugs-and-ideas forum guidelines
- [ ] Android beta invite: email and site banner text (Phase 5) — blocked on
      the same Google Group / Play opt-in links

## Phase 3: news webhook (Agent)

Read `convex/_generated/ai/guidelines.md` first.

**When to post: the moment a news item's feed card is first created.** That
is exactly two places, both in mutations:

1. `syncFeedEvent` in `apps/backend/convex/raceNews.ts`, the branch that calls
   `insertFeedEvent` (not the `existing` branch that patches). It runs from
   `raceNews.publish` for an item going straight to the feed, and from
   `raceNews.releaseToFeed` for an embargoed item (`feedVisibleAt`) when its
   embargo lifts. Hooking here means an embargoed item reaches Discord at
   release time, never before.
2. `globalNews.publish` in `apps/backend/convex/globalNews.ts`, the branch
   that calls `insertFeedEvent` because no feed card exists yet.

This gives the right behaviour without extra state:

- A correction (republish of an existing key) patches the card: **no repost**.
- A dry run (`raceNews.publish` with `dryRun`) returns before any write: no post.
- An item published with `feedSelected: false` never gets a card: no post.
- Retract then republish deletes and recreates the card: **posts again**. That
  is acceptable; say so in the docs.

Do not hook `insertFeedEvent` itself in `lib/feedSort.ts`: it is shared with
scores, practice results, seed data and other feed events. Do not use
`newsNotifications.select`/`fanout`: that is the push path, which only covers
items chosen for push.

- [x] New `apps/backend/convex/discord.ts` with an `internalAction`
      `postNews({ headline, sourceName, feedEventId })`:
  - [x] No-op when `process.env.DISCORD_NEWS_WEBHOOK_URL` is unset. Follows
        the env-gated, failures-swallowed pattern in
        `apps/backend/convex/indexNow.ts`.
  - [x] Link:
        `${process.env.APP_URL ?? 'https://grandprixpicks.com'}/feed/${feedEventId}?utm_source=discord&utm_campaign=news`
        (same fallback as `notificationEmails.ts`). The page
        (`apps/web/src/routes/feed.$feedEventId.tsx`) opens signed out for a
        news card, and hands on to the weekend write-up (`getRaceWriteup`),
        or the race page when that weekend has none.
  - [x] POST one embed: `title` = headline, `url` = link, `footer.text` =
        source name. Always sends `allowed_mentions: { parse: [] }`.
  - [x] Non-2xx or network error: `console.error` and return. Never throws.
- [x] At both insert sites, use the id `insertFeedEvent` returns and call
      `ctx.scheduler.runAfter(0, internal.discord.postNews, {...})`.
- [x] Tests (convex-test, stub `fetch`), in `raceNews.access.test.ts`,
      `raceNews.embargo.test.ts`, `globalNews.test.ts` and a new
      `discord.test.ts` — all 8 cases from the checklist covered.
- [x] Updated `docs/race-news.md` and `docs/automated-news-pipeline.md` to
      say a feed card also posts to Discord #news, once, and that a
      correction does not repost. Updated
      `.claude/skills/publish-race-news/SKILL.md`. Left `docs/notifications.md`
      alone — it is about push delivery, not a general outbound-channel list.
- [x] `pnpm test:backend` (546 passed), `pnpm typecheck`, `pnpm lint` all pass.
- [ ] Dev check: needs the dev webhook env var set (Barry's step above) before
      it can run. Once set: publish a dev news item and confirm one post
      lands in #mod; republish it and confirm no second post.

## Phase 4: links in the product (Agent, needs the invite URL)

- [x] `apps/web/src/lib/site.ts`: add `social.discord = { name: 'Discord', url }`.
      Leave Reddit in place. Do not add Discord to the `sameAs` JSON-LD list:
      an invite is not a profile.
- [x] `apps/web/src/components/Footer.tsx`: add Discord beside the Reddit
      link. Match the existing `ariaLabel` pattern.
- [x] `apps/web/src/routes/support.tsx`: one line offering Discord for bugs
      and ideas, below the email option. Email stays the main channel.
- [x] `apps/trmnl/src/settings.yml`: add a Discord link to the `author_bio`
      description beside the GitHub link, **before** the plugin is submitted.
      Keep `learn_more_url` as is.
- [x] Mobile: `MoreScreen.tsx` already links out (Support, Privacy, Terms) —
      added a Discord row in the same "Help & legal" group, no new screen.
- [x] `pnpm lint`, `pnpm typecheck` pass. `pnpm test:web` not run (no test
      changed behaviour). Verified on the dev server (port 3000): footer
      shows Discord beside Reddit, support page shows the one-line offer.

## Phase 5: launch with the Android beta (Barry, agent drafts)

- [ ] Play Console: create a **closed** testing track with a Google Group as
      the tester list, so anyone with the link can join without Barry adding
      emails. Keep the internal track for Barry's own quick builds.
      `apps/mobile/eas.json` submits to `internal` today; add a submit profile
      with `track: "alpha"` (EAS's name for closed testing) rather than
      changing the existing one.
- [ ] Put the Google Group link and Play opt-in link in the #android-beta
      pinned message.
- [ ] Site-wide banner through `announcements.adminSetAnnouncement` (admin
      UI): Android testers wanted, link to the Discord invite. Clear it when
      the beta goes to production.
- [ ] Email the beta invite to existing users. Plain text, one link.
- [ ] Post in #announcements once the first members arrive.
- [ ] Add a `GPP: Discord one-month check` event to Google Calendar, one month
      after launch.

## Phase 6: one-month check

The question is whether people post without being prompted, not how many
joined.

- Keep as is: other people start threads in #general or #bugs-and-ideas.
- Trim to beta + TRMNL + news: only Barry and the webhook post after the beta.
- If r/GPPicks is revived with automation, the Discord webhook post and the
  Reddit post should come from the same trigger in Phase 3.

## Copy drafts

Drafts to tighten in Phase 2. Paste into Discord, not the repo.

**Server description**

> Grand Prix Picks: F1 top 5 predictions. Android beta, TRMNL plugin, bugs and ideas.

**#welcome**

> Grand Prix Picks is an F1 prediction game at grandprixpicks.com. This server
> is for the Android beta, the TRMNL plugin, F1 news, and bug reports and
> ideas.
>
> Rules
>
> 1. Be decent to each other.
> 2. Mark race result spoilers with `||spoiler tags||` for 24 hours.
> 3. No self-promotion or referral links.
> 4. Bugs go in #bugs-and-ideas, one post per bug.
>
> Account problem? Email support@grandprixpicks.com.

**Channel topics**

- #announcements: New builds, plugin releases and features.
- #news: F1 news from the Grand Prix Picks feed.
- #android-beta: Builds, known issues and feedback for the Android beta.
- #trmnl: The Formula 1 Race Weekend plugin for TRMNL.
- #bugs-and-ideas: One post per bug or idea. Tag it.
- #general: Anything F1.

**#trmnl pinned**

> Report a layout problem with: device model, layout size (full, half or
> quadrant), your time zone, and a photo or screenshot.

**#android-beta pinned (current, until the beta opens)**

> Android beta: not open yet. React with 🙋 if you want in and you'll get a
> ping here the moment builds land.

**#android-beta pinned (swap in once Phase 5's links exist)**

> Join: [Google Group link] then opt in at [Play opt-in link]. Builds land
> here first.
>
> Report a bug with: device model, Android version, and what you were doing
> when it happened. Known issues are pinned below this message.

**#bugs-and-ideas forum guidelines**

> One post per bug or idea. Tag it: `bug`, `idea`, `web`, `android`, `ios`, or
> `trmnl`. For a bug, include what you expected and what happened. A post gets
> the `fixed` tag once it ships.

**Android beta invite: email**

> Subject: Try the Grand Prix Picks Android app
>
> We're testing the Android app before it goes live. Join the Discord server
> for build links and to report bugs: [invite link]

**Android beta invite: site banner**

> Android beta open. Join the Discord for the link.
