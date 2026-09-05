import { getGuideMeta } from '../../../src/lib/guideMeta';
import { renderOgImage } from '../../../src/lib/og/renderer';
import { guideTemplate } from '../../../src/lib/og/templates';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = {
  req: Request;
};

/**
 * Falls back to the site card rather than erroring: an unknown slug reaches
 * here from a scraper following a stale link, and a broken image is a worse
 * answer to that than the generic brand card.
 */
const DEFAULT_IMAGE_REDIRECT = new Response(null, {
  status: 302,
  headers: {
    location: '/og-default.png',
    'cache-control': 'public, max-age=300',
  },
});

/**
 * The link-preview card for `/guides/<slug>`, selected by `?slug=`.
 *
 * One route for every guide. The alternative was a card per guide under its
 * own path, which would have meant remembering to add one each time a guide is
 * written; this way a guide that exists in `guideMeta.ts` has a card, and the
 * two cannot disagree because both read the same front matter.
 *
 * Reads only the front matter, never `guides.ts`. That keeps the prose out of
 * the server bundle for the same reason the route's loader avoids it.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const slug = url.searchParams.get('slug');
    const guide = slug ? getGuideMeta(slug) : null;
    if (!guide) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }

    const png = await startServerSpan({ name: 'og.renderGuideCard' }, () =>
      renderOgImage(
        guideTemplate({ title: guide.title, summary: guide.summary }),
        'og',
      ),
    );

    // Copy into a fresh Uint8Array<ArrayBuffer> — renderOgImage's output is
    // typed over ArrayBufferLike, which BodyInit rejects.
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `inline; filename="${guide.slug}.png"`,
        // Same reasoning as the 2027 line-up card: a guide's title and summary
        // only change when the repo does, so a scraper holding this for a day
        // is holding the right image.
        'cache-control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.guideCard' });
    console.error('[og/guide] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render guide card', { status: 500 });
  }
}
