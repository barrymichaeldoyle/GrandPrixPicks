import { v } from 'convex/values';

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  type SitemapEntry,
  indexNowSitemapDelta,
  indexNowUrlsForPublishedPractice,
  indexNowUrlsForPublishedResult,
  parseSitemapEntries,
} from '@grandprixpicks/shared/indexNow';

import { internal } from './_generated/api';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';

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

/** Every stamp the sweep has already announced, as the delta function wants it. */
export const knownSubmissions = internalQuery({
  args: {},
  returns: v.array(v.object({ url: v.string(), lastmod: v.string() })),
  handler: async (ctx) => {
    const rows = await ctx.db.query('indexNowSubmissions').collect();
    return rows.map(({ url, lastmod }) => ({ url, lastmod }));
  },
});

/** Bank the stamps a sweep announced, so the next one does not repeat them. */
export const recordSubmissions = internalMutation({
  args: {
    entries: v.array(v.object({ url: v.string(), lastmod: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, { entries }) => {
    const submittedAt = Date.now();
    for (const { url, lastmod } of entries) {
      const existing = await ctx.db
        .query('indexNowSubmissions')
        .withIndex('by_url', (q) => q.eq('url', url))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { lastmod, submittedAt });
      } else {
        await ctx.db.insert('indexNowSubmissions', {
          url,
          lastmod,
          submittedAt,
        });
      }
    }
    return null;
  },
});

/**
 * Tell IndexNow about hand-edited pages whose review stamp moved.
 *
 * The publish pings cover everything a result or a practice classification
 * changes. Nothing covered the pages a person edits: the guides, the race
 * write-ups and the two 2027 reference pages. Those are exactly the pages
 * where freshness is the point, and until this existed the only signal was the
 * next organic crawl.
 *
 * It reads the **live** sitemap rather than anything in this deployment,
 * because the question is what a crawler would be sent to, and web ships
 * separately from Convex. A sweep that ran against source could announce a
 * page that is not live yet, which is worse than announcing nothing.
 */
export const sweepSitemap = internalAction({
  args: {},
  returns: v.object({
    submitted: v.boolean(),
    reason: v.optional(v.string()),
    count: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const host = process.env.INDEXNOW_HOST;
    if (!host) {
      return { submitted: false, reason: 'INDEXNOW_HOST not set' };
    }

    let entries: SitemapEntry[];
    try {
      const response = await fetch(`https://${host}/sitemap.xml`);
      if (!response.ok) {
        console.warn(`[indexNow] sitemap ${response.status} from ${host}`);
        return { submitted: false, reason: `sitemap http ${response.status}` };
      }
      entries = parseSitemapEntries(await response.text());
    } catch (error) {
      console.warn('[indexNow] sitemap fetch failed', error);
      return { submitted: false, reason: 'sitemap fetch threw' };
    }

    // An empty parse means the sitemap changed shape, not that every page is
    // gone. Recording that would bank nothing and submit nothing forever.
    if (entries.length === 0) {
      console.warn('[indexNow] sitemap parsed to zero entries');
      return { submitted: false, reason: 'sitemap parsed empty' };
    }

    const known = await ctx.runQuery(internal.indexNow.knownSubmissions, {});
    const { submit, record } = indexNowSitemapDelta(
      entries,
      new Map(known.map(({ url, lastmod }) => [url, lastmod])),
    );

    if (submit.length > 0) {
      const result = await submitUrls(() => submit.map((entry) => entry.loc));
      // Bank nothing if the POST failed, so the next sweep tries again.
      if (!result.submitted) {
        return result;
      }
    }

    if (record.length > 0) {
      await ctx.runMutation(internal.indexNow.recordSubmissions, {
        entries: record.map((entry) => ({
          url: entry.loc,
          lastmod: entry.lastmod,
        })),
      });
    }

    return { submitted: submit.length > 0, count: submit.length };
  },
});
