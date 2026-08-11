# Season Pass → PRO subscription

Plan for replacing the one-time 2026 Season Pass with a recurring monthly PRO
subscription, on Paddle.

**Why this is cheap:** nobody has bought a Season Pass. `userSeasonPasses` is
empty in prod, so there is no revenue to protect, no refunds to issue, and no
grandfathering to design. This is a rename plus a billing-mode change, not a
data migration.

## Where things stand

Already shipped (see the "Free public league" section at the bottom):

- `apps/backend/convex/lib/entitlements.ts` is the single place that decides
  whether a user is on the paid tier. Everything else asks for a **plan**
  (`'free' | 'pro'`), never for a pass.
- Free players get one public league. Public league creation is no longer a
  paid feature at all.

That entitlement layer is the whole point: steps 2 and 3 below only touch
`resolvePlan` and the webhook, not the ~15 call sites that gate on the plan.

## Step 1: Paddle dashboard (no code)

1. Create a **PRO** product with a recurring monthly price.
2. Decide the price. The Season Pass was a one-time full-season purchase, so
   the monthly number needs to stand on its own rather than be that figure
   divided by 12.
3. Optionally add an annual price on the same product for a discounted yearly
   option. The code below handles both without changes.
4. Subscribe the existing webhook endpoint to the subscription events:
   `subscription.created`, `subscription.updated`, `subscription.canceled`,
   `subscription.past_due`, `transaction.completed`.
5. New env vars alongside the existing ones:
   - `PADDLE_PRO_MONTHLY_PRICE_ID`
   - `PADDLE_PRO_ANNUAL_PRICE_ID` (only if you add the annual price)

   Keep `PADDLE_SEASON_PASS_PRICE_ID` set until step 5 retires it.

## Step 2: Subscriptions table

Add to `apps/backend/convex/schema.ts`:

```ts
userSubscriptions: defineTable({
  userId: v.id('users'),
  status: v.union(
    v.literal('active'),
    v.literal('trialing'),
    v.literal('past_due'),
    v.literal('canceled'),
  ),
  // Paddle keeps billing until the end of a paid period after a cancel, so
  // entitlement runs to this timestamp, not to the cancel event.
  currentPeriodEndsAt: v.number(),
  paddleSubscriptionId: v.string(),
  paddleCustomerId: v.optional(v.string()),
  paddlePriceId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_paddleSubscriptionId', ['paddleSubscriptionId']),
```

Note this table is **not** keyed by season. That is the real modelling change:
a season pass answers "did you pay for 2026", a subscription answers "are you
paid up right now". `resolvePlan` already takes a `season` argument, which the
subscription branch simply ignores.

Then extend `resolvePlan` in `lib/entitlements.ts`:

```ts
export async function resolvePlan(ctx, userId, season): Promise<Plan> {
  const subscription = await ctx.db
    .query('userSubscriptions')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();

  if (
    subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing') &&
    subscription.currentPeriodEndsAt > Date.now()
  ) {
    return 'pro';
  }

  // Legacy: honoured for as long as any season pass rows exist.
  if (await hasSeasonPassForSeason(ctx, userId, season)) {
    return 'pro';
  }

  return 'free';
}
```

Keeping the season-pass branch costs one index read and means step 2 can ship
on its own without a flag day. Delete it in step 5.

Treat `past_due` as `free` but leave the row in place, so a recovered payment
restores PRO without a re-purchase. If you'd rather give a grace period, widen
the condition to `past_due` with `currentPeriodEndsAt > Date.now()` instead of
adding a separate grace field.

## Step 3: Webhook

`apps/web/server/lib/paddle.ts:215` currently early-returns on anything that
isn't `transaction.completed`. Widen it to a switch over the subscription
events and add a `syncSubscriptionFromPaddle` mutation next to
`grantSeasonPassFromPaddle` in `apps/backend/convex/billing.ts`.

Reuse what is already right in that file, all of which carries over unchanged:

- the `PADDLE_CONVEX_WEBHOOK_KEY` shared-secret check
- `processedPaddleWebhookEvents` for idempotency
- the `ignored_user_not_found` path for webhooks that beat the Clerk user

Two things the new mutation needs that the pass one didn't:

- **Out-of-order events.** Paddle does not guarantee ordering, and a stale
  `subscription.updated` arriving after a `subscription.canceled` would
  resurrect PRO. Store Paddle's event `occurred_at` on the row and ignore any
  event older than what you have.
- **A single row per user.** Upsert on `paddleSubscriptionId`, and if a user
  somehow ends up with two subscriptions, let the latest
  `currentPeriodEndsAt` win.

`processedPaddleWebhookEvents.status` is a two-literal union
(`'processed' | 'ignored_user_not_found'`); if you want a third outcome for
stale events, widen that union in the schema.

## Step 4: Product surfaces

- `/pricing` — recurring price, monthly/annual toggle if you added annual, and
  the FAQ answer "Is this a subscription?" (`pricing.tsx`) inverts.
- `/pay` — Paddle checkout with the subscription price ID.
- `/refund-policy` — a subscription needs cancellation terms, not just refund
  terms. Paddle is Merchant of Record, so its consumer-rights defaults apply;
  check what Paddle requires you to state.
- `/settings` — `SeasonPassSection.tsx` becomes a subscription section:
  current status, renewal date, and a **Manage subscription** link to the
  Paddle customer portal. Self-serve cancellation is effectively mandatory.
- `PurchaseSuccessBanner.tsx` — copy shifts from "pass unlocked" to
  "subscription active".
- `apps/web/src/lib/navigation.ts` and `about.tsx` mention the pass in copy.
- Rename the user-facing noun **Season Pass → PRO** everywhere in one commit.

Note that `/pricing` is currently `noIndex: true` (`pricing.tsx:53`). A
subscription page is worth indexing; flip that when the copy is final.

## Step 5: Retire the pass

Once the subscription is live and has taken at least one real payment:

1. Delete the season-pass branch in `resolvePlan`.
2. Delete `grantSeasonPassFromPaddle` from `billing.ts` and its handling in
   `paddle.ts`.
3. Delete the `hasSeasonPassForSeason` query in `users.ts` and the
   `hasSeasonPass` deprecated alias in `getMyLeagueUsage`.
4. Drop `userSeasonPasses` from the schema, and its cleanup block in the user
   deletion path (`users.ts:256`) — that block is what keeps account deletion
   complete, so it goes at the same time as the table, not before.
5. Remove `PADDLE_SEASON_PASS_PRICE_ID` and deactivate the Paddle product.

Steps 3 and 4 are the only ones that need care: `users.ts` deletion summary
has a `userSeasonPasses` counter in its return validator, so removing it is a
public-shape change.

## What PRO should actually include

Currently the only thing the paid tier gates is league limits, and that is thin
for a recurring charge. A monthly subscription needs a reason to keep paying
each month, which one-time league capacity is not. Worth deciding before
pricing:

- Higher league limits (what exists today)
- Advanced stats / historical pick analysis
- Custom league scoring rules
- Ad-free, if ads land (there's an AdSense thread in the project notes)

This is a product decision, not a code one, but it determines the price and
should be settled before step 1.

## Risks

- **Nothing is transactional across Paddle and Convex.** A webhook that fails
  after Paddle charges leaves a paying user on `free`. The idempotency table
  makes retries safe; make sure webhook failures actually alert via Sentry.
- **The webhook runs in the web layer, not Convex.** A web deploy that lags a
  Convex deploy can drop subscription events. `pnpm deploy` ships web without
  Convex, so deploy Convex first.
- **Testing.** Paddle Sandbox has its own price IDs and webhook secret. Point
  the dev Convex deployment at Sandbox and never at live keys.

---

## Appendix: the free public league (shipped)

Changed on 2026-08-06, ahead of the subscription work:

- **New** `apps/backend/convex/lib/entitlements.ts` — `Plan`,
  `PLAN_LEAGUE_LIMITS`, `resolvePlan`, `getLeagueEntitlement`,
  `isLeagueCreateLimitReached`. Free public league creation went `0 → 1`.
- `leagues.ts` — dropped the local `FREE_LIMITS` / `SEASON_PASS_LIMITS` tables
  and the "Only Season Pass users can create public leagues" hard block;
  public leagues are now governed by the same numeric limit as private ones.
  `getMyLeagueUsage` returns `plan` and `isPro`, with `hasSeasonPass` kept as a
  deprecated alias.
- `leagues/create.tsx` — the visibility toggle is no longer hidden from free
  users. Public is disabled once the allowance is used, with an upgrade nudge.
- `leagues/index.tsx`, `LeagueDetailContent.tsx` — gate on `isPro`.
- `pricing.tsx` — public leagues are sold as "five instead of the free one"
  rather than as a pass-only feature.
- **New** `lib/entitlements.test.ts` — 6 tests over the limit rules.
