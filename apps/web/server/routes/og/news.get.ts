import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { getRaceTimeZoneFromSlug } from '@grandprixpicks/shared/raceTimezones';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { raceNewsTemplate } from '../../../src/lib/og/templates';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { loadFlagDataUri } from '../../lib/ogFlag';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = {
  req: Request;
};

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: { location, 'cache-control': 'public, max-age=300' },
  });
}

/**
 * The link-preview card for one race news story:
 * `?race=<slug>&story=<key>`.
 *
 * Reads the same `raceNews.list` the write-up renders, so a story that is
 * retracted or taken off the write-up loses its card too. That case, and an
 * unknown key, falls back to the write-up's own card rather than an error: the
 * link still goes to the write-up, so its card is still true.
 */
export default async function handler(event: RouteEvent) {
  const url = new URL(event.req.url);
  const slug = url.searchParams.get('race');
  const key = url.searchParams.get('story');
  if (!slug) {
    return redirect('/og-default.png');
  }
  const writeupCard = `/og/writeup?race=${encodeURIComponent(slug)}`;
  try {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    const convex = new ConvexHttpClient(convexUrl);
    const { race, items } = await convex.query(api.raceNews.list, {
      raceSlug: slug,
    });
    const story = items.find((item) => item.key === key);
    if (!race || !story) {
      return redirect(writeupCard);
    }

    const dateLabel = new Intl.DateTimeFormat('en-GB', {
      timeZone: getRaceTimeZoneFromSlug(race.slug) ?? 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(story.sourcePublishedAt ?? story.publishedAt));

    const flagSrc = await loadFlagDataUri(url.origin, race);
    const png = await startServerSpan({ name: 'og.renderNewsCard' }, () =>
      renderOgImage(
        raceNewsTemplate({
          raceName: race.name,
          round: race.round,
          flagSrc,
          headline: story.headline,
          sourceName: story.sourceName,
          dateLabel,
          drivers: story.drivers.map((driver) => ({
            code: driver.code,
            teamColor:
              (driver.team ? TEAM_COLORS[driver.team] : undefined) ??
              FALLBACK_TEAM_COLOR,
          })),
        }),
      ),
    );

    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        // Short: a headline can be corrected after it is posted. The page adds
        // the story's revision to the image URL, so a corrected headline is
        // also a new URL for scrapers that cache longer than this.
        'cache-control': 'public, max-age=600, s-maxage=600',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.newsCard' });
    console.error('[og/news] render_failed_falling_back_to_writeup', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return redirect(writeupCard);
  }
}
