import { v } from 'convex/values';

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  indexNowUrlsForPublishedPractice,
  indexNowUrlsForPublishedResult,
} from '@grandprixpicks/shared/indexNow';

import { internalAction } from './_generated/server';

const submissionResult = v.object({
  submitted: v.boolean(),
  reason: v.optional(v.string()),
  count: v.optional(v.number()),
});

/**
 * POST a URL list to IndexNow.
 *
 * Gated on `INDEXNOW_HOST`, which is set on the production deployment only.
 * Without it this is a no-op, which is what dev wants: a dev deployment
 * submitting `grandprixpicks.com` URLs whose content it does not own is worse
 * than not submitting at all.
 *
 * Failures are swallowed on purpose. This runs off the back of publishing and
 * no search-engine ping is worth failing that. The sitemap still carries every
 * URL, so a dropped submission costs nothing but the speed-up: Bing finds the
 * change on its own schedule instead of within minutes.
 */
async function submitUrls(
  buildUrls: (origin: string) => string[],
): Promise<{ submitted: boolean; reason?: string; count?: number }> {
  const host = process.env.INDEXNOW_HOST;
  if (!host) {
    return { submitted: false, reason: 'INDEXNOW_HOST not set' };
  }

  const urls = buildUrls(`https://${host}`);

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `https://${host}${INDEXNOW_KEY_PATH}`,
        urlList: urls,
      }),
    });

    if (!response.ok) {
      console.warn(
        `[indexNow] ${response.status} ${response.statusText} for ${urls.length} url(s)`,
      );
      return { submitted: false, reason: `http ${response.status}` };
    }
    return { submitted: true, count: urls.length };
  } catch (error) {
    console.warn('[indexNow] submission failed', error);
    return { submitted: false, reason: 'threw' };
  }
}

/** Ping IndexNow for the pages a published session result just changed. */
export const submitPublishedResult = internalAction({
  args: { raceSlug: v.string() },
  returns: submissionResult,
  handler: (_ctx, { raceSlug }) =>
    submitUrls((origin) => indexNowUrlsForPublishedResult(origin, raceSlug)),
});

/**
 * Ping IndexNow for a race's practice page once a classification lands.
 *
 * Separate from {@link submitPublishedResult} because practice is ingested by
 * a poller rather than published by an admin, and because it changes a
 * different, much smaller set of URLs. Submitting URLs that did not change is
 * how a site gets its IndexNow quota throttled.
 */
export const submitPublishedPractice = internalAction({
  args: { raceSlug: v.string() },
  returns: submissionResult,
  handler: (_ctx, { raceSlug }) =>
    submitUrls((origin) => indexNowUrlsForPublishedPractice(origin, raceSlug)),
});
