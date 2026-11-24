import { internal } from '../_generated/api';
import type { MutationCtx } from '../_generated/server';

/**
 * How long a change waits before the news API's change feed returns it.
 *
 * `updatedAt` is stamped when a mutation starts, not when it commits, so two
 * overlapping writes can commit out of stamp order. A reader that had already
 * moved its cursor past the later stamp would never see the earlier one.
 * Holding back the last few seconds lets every write in that window land
 * first. Pollers (`newsApi:list`) and webhooks (`newsApiWebhooks.ts`) read
 * the same feed, so both wait this long.
 */
export const SETTLE_MS = 5_000;

/**
 * Tell webhook endpoints a story changed. Called by every mutation that moves
 * a story's `updatedAt`: `raceNews:publish`, `retract`, `move`,
 * `globalNews:publish`, `retract`, and `newsApiTranslations:store` when a
 * translation lands.
 *
 * It sends nothing itself. It books one drain for just after the change has
 * settled, and the drain reads the change feed, so the order and the
 * same-millisecond rules stay the feed's. With no active endpoint it books
 * nothing, which is every deployment today.
 */
export async function scheduleWebhookDrain(ctx: MutationCtx): Promise<void> {
  const active = await ctx.db
    .query('newsApiWebhooks')
    .withIndex('by_active', (q) => q.eq('active', true))
    .first();
  if (active) {
    await ctx.scheduler.runAfter(
      SETTLE_MS + 1_000,
      internal.newsApiWebhooks.drain,
      {},
    );
  }
}

/**
 * Book the translations of a story whose English is new, changed, or live
 * again after a retraction (`newsApiTranslations:translate`). Called by
 * `raceNews:publish` and `globalNews:publish` beside `scheduleWebhookDrain`.
 * `raceNews:move` keeps the id and the text, so its translations still match
 * and it books nothing.
 *
 * The run is idempotent: languages already translated from this exact text
 * are skipped, and a story corrected again before it runs is translated from
 * the newer text. Without `ANTHROPIC_API_KEY` it does nothing. Nothing here
 * can fail the publish: the run is a separate scheduled action.
 *
 * When it stores a new language it moves the story's `updatedAt` once, so
 * the change feed and webhooks report a `news.updated` whose `languages`
 * grew. That bump books a drain and never another translation.
 */
export async function scheduleTranslation(
  ctx: MutationCtx,
  newsId: string,
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.newsApiTranslations.translate, {
    newsId,
    bump: true,
  });
}
