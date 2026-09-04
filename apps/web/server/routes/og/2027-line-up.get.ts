import { renderOgImage } from '../../../src/lib/og/renderer';
import { lineUp2027Template } from '../../../src/lib/og/templates';
import {
  countSeats,
  LINE_UP_2027,
  LINE_UP_2027_REVIEWED_LABEL,
  totalSeats,
} from '../../../src/lib/lineUp2027';
import { displayTeamName } from '../../../src/lib/display';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { captureServerException, startServerSpan } from '../../lib/sentry';

/**
 * The link-preview card for `/f1-2027-driver-line-up`.
 *
 * The only OG route with no Convex call in it: the line-up is hand-maintained
 * repo data, so the card is a pure function of the same module the page reads
 * and changes in the same deploy. That also means there is no empty state to
 * fall back from, and no reason to reach for `defaultBrandTemplate`.
 */
export default async function handler() {
  try {
    const counts = countSeats();
    const openSeats = LINE_UP_2027.flatMap((entry) =>
      entry.seats
        .filter((seat) => seat.status === 'out-of-contract')
        .map((seat) => ({
          driver: seat.driver,
          team: displayTeamName(entry.team),
          color: TEAM_COLORS[entry.team] ?? FALLBACK_TEAM_COLOR,
        })),
    );

    const png = await startServerSpan({ name: 'og.renderLineUp2027Card' }, () =>
      renderOgImage(
        lineUp2027Template({
          reviewedLabel: LINE_UP_2027_REVIEWED_LABEL,
          signed: counts.signed,
          expected: counts.expected,
          outOfContract: counts['out-of-contract'],
          total: totalSeats(),
          openSeats,
        }),
        'og',
      ),
    );

    // Copy into a fresh Uint8Array<ArrayBuffer> — renderOgImage's output is
    // typed over ArrayBufferLike, which BodyInit rejects.
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': 'inline; filename="f1-2027-driver-line-up.png"',
        // Longer than the standings cards: this one only changes when the repo
        // does, so a scraper holding it for a day is holding the right image.
        'cache-control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.lineUp2027Card' });
    console.error('[og/2027-line-up] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render 2027 line-up card', { status: 500 });
  }
}
