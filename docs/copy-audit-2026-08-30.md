# Web copy audit — 30 August 2026

## Resolution

All findings in this audit were resolved on 30 August 2026. The sections below
retain the original findings and the direction used for the fixes. The shared
scoring note is now centralized, action boundaries supply specific fallback
errors, and `pnpm copy:audit` reports no warnings.

## Scope

This audit applies the rules in `docs/product-voice.md` to player-facing web UI
source. It covers routes, shared components, metadata, errors, empty states, and
the signed-out landing flow.

Tests, stories, admin tooling, legal pages, long-form guides, and editorial
circuit content are outside the automated scan. They still follow the voice
guide when edited, but factual contrast and longer prose are more likely to be
appropriate there.

The automated check identifies candidate language, not defects. Findings below
were reviewed in context.

## High-confidence changes

### 1. Replace the duplicated grid-penalty explainer

Locations:

- `apps/web/src/components/FeedItem/NewsGroup.tsx`
- `apps/web/src/components/WeekendNewsSection.tsx`

Current:

> A penalty moves where a driver starts, not where they were classified.  
> **How each session is scored**

Recommended:

> Grid penalties don’t change qualifying results.  
> **How scoring works**

The current line uses an abstract subject, an emphatic contrast, and a verbose
link. It is duplicated across two implementations, so the copy should also be
centralized or the UI should share one component.

### 2. Replace “unlock” with the actual entitlement or next step

Locations:

- `apps/web/src/routes/leagues/$slug/-components/LeagueDetailContent.tsx`
- `apps/web/src/routes/leagues/$slug/-components/LeagueMembers.tsx`
- `apps/web/src/routes/leagues/index.tsx`
- `apps/web/src/routes/pricing.tsx`
- `apps/web/src/routes/races/$raceSlug/-components/RaceEventPage/RaceEventPage.tsx`
- `apps/web/src/routes/settings/-components/PurchaseSuccessBanner.tsx`
- `apps/web/src/routes/settings/-components/SeasonPassSection.tsx`

Recommended direction:

- Limit reached: “You’ve reached the free league limit.” / **View Season Pass**
- Pricing: “Season Pass includes unlimited league joins and up to five public
  leagues.”
- Hidden standings: “Submit your picks to see the race weekend standings.”
- Pick dependency: “Save your Top 5 before making Head-to-Head picks.”
- Purchase success: “You can now join unlimited leagues and create up to five
  public leagues.”

“Unlock” obscures several different facts: a paid entitlement, a prerequisite,
and hidden standings. Naming each outcome is shorter and clearer.

### 3. Make fallback errors specific to the failed action

Locations include:

- `apps/web/src/lib/userFacingError.ts`
- `apps/web/src/routes/settings.tsx`
- `apps/web/src/routes/support.tsx`
- `apps/web/src/routes/leagues/create.tsx`
- `apps/web/src/routes/leagues/$slug/-components/LeagueDetailContent.tsx`
- `apps/web/src/routes/leagues/$slug/settings.tsx`
- `apps/web/src/components/PredictionForm.tsx`
- `apps/web/src/components/H2HPredictionForm.tsx`
- `apps/web/src/components/FeedbackModal.tsx`

The shared fallback, “Something went wrong. Please try again,” cannot say what
failed. Several callers also fall back to implementation-shaped messages such
as “Failed to create league.”

Recommended direction: let each action provide its fallback while the shared
mapper continues to sanitize server errors. Examples:

- “Your profile wasn’t updated. Try again.”
- “Your support request wasn’t sent. Try again.”
- “The league wasn’t created. Try again.”
- “Your picks weren’t saved. Try again.”

### 4. Remove conversational filler from checkout errors

Location: `apps/web/src/routes/pay.tsx`

Current variants include “This one is on us, not you” and “Something went wrong
opening the secure checkout window.”

Recommended:

> Checkout couldn’t open. Nothing has been charged. Try again from the pricing
> page.

This preserves the payment reassurance and recovery path without the assistant
voice.

## Medium-confidence changes

### 5. Remove landing-page slogan formulas

Locations:

- `apps/web/src/routes/-home/LandingPicks.tsx`
- `apps/web/src/routes/-home/CompetitionSection.tsx`
- `apps/web/src/routes/-home/ScoringSection.tsx`
- `apps/web/src/routes/how-to-play.tsx`

Candidates and clearer directions:

| Current                                    | Suggested direction                                   |
| ------------------------------------------ | ----------------------------------------------------- |
| “That’s your prediction card.”             | “Your prediction is ready.”                           |
| “Free to play. These picks come with you.” | “Free to play. Your picks are kept when you sign in.” |
| “One set of picks. Every table.”           | “Your picks count on every leaderboard.”              |
| “Make a more informed prediction”          | “Form and scoring guides”                             |
| “Ready to make your picks?”                | “Make your picks”                                     |

“Close still counts” is worth keeping. It is brief, specific to this scoring
system, and the sentence below immediately explains it.

### 6. Replace vague announcement links

Locations:

- `apps/web/src/components/AnnouncementBanner.tsx`
- `apps/web/src/components/NotificationItem.tsx`

Both fall back to “Read more.” Require the author-supplied link label where
possible; otherwise use **View announcement**. The destination should not depend
on surrounding copy to make sense.

### 7. Name empty states precisely

Locations:

- `apps/web/src/routes/-leaderboard/FollowingContent.tsx`
- `apps/web/src/routes/-leaderboard/WeekendContent.tsx`
- `apps/web/src/components/feed/FeedContent.tsx`
- `apps/web/src/routes/-dashboard/DashboardWeekendPicks.tsx`

“No one here yet” does not distinguish between following nobody and followed
players having no score. Use the actual state:

- “No followed players yet.”
- “No followed players submitted picks this weekend.”
- “Follow players to see their picks and results here.”
- “No prediction window is open.”

The repeated “will appear here” construction is not inherently wrong, but it
should only remain when timing is the useful fact.

### 8. Use sentence case on the pricing sign-in action

Location: `apps/web/src/routes/pricing.tsx`

Change **Sign In to Continue** to **Sign in to continue**. This is both plainer
and consistent with the design system’s sentence-case rule.

### 9. Remove generic “community” language from league discovery

Location: `apps/web/src/routes/leagues/index.tsx`

Current:

> Browse open leagues and join the communities you want to compete in.

Recommended:

> Browse public leagues and join one to compete.

“Communities” adds positioning language without adding information.

## Deliberate exceptions

The results policy uses contrasts such as “classification, not the starting
grid.” Those distinctions are the subject of the page and prevent a scoring
misunderstanding, so they are justified. The warning-only check excludes that
page rather than teaching agents that every contrast construction is wrong.

Technical terms such as “unlocked picks” in internal types and comments are not
product copy and are also excluded from editorial findings.

## Recommended order

1. Fix the duplicated penalty explainer and centralize it.
2. Replace the Season Pass “unlock” cluster.
3. Give action boundaries specific fallback errors.
4. Tighten checkout errors, links, and empty states.
5. Revisit the landing-page candidates together so their hierarchy remains
   coherent after copy is removed.
