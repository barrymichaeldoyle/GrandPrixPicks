import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { parseShareCard } from '../../../src/lib/og/shareCard';
import {
  shareH2HResultsTemplate,
  shareH2HScoreTemplate,
  sharePicksTemplate,
  shareResultsTemplate,
  shareScoreTemplate,
} from '../../../src/lib/og/templates';
import { getCountryCodeForRace } from '../../../src/lib/raceCountries';
import { SESSION_LABELS } from '../../../src/lib/sessions';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = {
  req: Request;
};

const DEFAULT_IMAGE_REDIRECT = new Response(null, {
  status: 302,
  headers: {
    location: '/og-default.png',
    'cache-control': 'public, max-age=300',
  },
});

/**
 * Renders per-user share cards (picks / score) as OG images.
 * All card data arrives via validated query params — see shareCard.ts for
 * why the data travels in the URL instead of being fetched per user.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const card = parseShareCard(Object.fromEntries(url.searchParams));
    const raceSlug = url.searchParams.get('race');
    if (!card || !raceSlug) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }

    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    const convex = new ConvexHttpClient(convexUrl);

    const race = await convex.query(api.races.getRaceBySlugOrLegacyRef, {
      ref: raceSlug,
    });
    if (!race) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }

    const flagSrc = await loadFlagDataUri(url.origin, race);

    const template = await (async () => {
      if (card.variant === 'picks' || card.variant === 'result') {
        const data = {
          raceName: race.name,
          round: race.round,
          season: race.season,
          sessionLabel: SESSION_LABELS[card.session],
          flagSrc,
          picks: await resolvePickColors(convex, card.picks),
        };
        return card.variant === 'picks'
          ? sharePicksTemplate({
              ...data,
              by: card.by,
            })
          : shareResultsTemplate(data);
      }
      if (card.variant === 'h2h_result') {
        return shareH2HResultsTemplate({
          raceName: race.name,
          round: race.round,
          season: race.season,
          sessionLabel: SESSION_LABELS[card.session],
          flagSrc,
          winners: await resolvePickColors(convex, card.winners),
        });
      }
      if (card.variant === 'h2h_score') {
        return shareH2HScoreTemplate({
          raceName: race.name,
          round: race.round,
          season: race.season,
          sessionLabel: SESSION_LABELS[card.session],
          by: card.by,
          flagSrc,
          correct: card.correct,
          total: card.total,
          points: card.points,
        });
      }
      return shareScoreTemplate({
        raceName: race.name,
        round: race.round,
        season: race.season,
        by: card.by,
        flagSrc,
        points: card.points,
        final: card.final,
      });
    })();

    const png = await startServerSpan({ name: 'og.renderShareCard' }, () =>
      renderOgImage(template),
    );

    // Copy into a fresh Uint8Array<ArrayBuffer> — renderOgImage's output is
    // typed over ArrayBufferLike, which BodyInit rejects.
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        // Same URL params always produce the same image — cache aggressively.
        'cache-control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.shareCard' });
    console.error('[og/share] render_failed_falling_back_to_default', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return DEFAULT_IMAGE_REDIRECT.clone();
  }
}

/**
 * Loads the race's country flag (same-origin static SVG, the assets the Flag
 * component uses) as a data URI for satori. Returns undefined on any failure
 * so the card still renders, just without a flag.
 */
async function loadFlagDataUri(
  origin: string,
  race: { slug: string },
): Promise<string | undefined> {
  const countryCode = getCountryCodeForRace(race);
  if (!countryCode) {
    return undefined;
  }
  try {
    const res = await fetch(`${origin}/flags/${countryCode}.svg`);
    if (!res.ok) {
      return undefined;
    }
    const svg = new Uint8Array(await res.arrayBuffer());
    // Chunked conversion — some flag SVGs are >100KB, far beyond the safe
    // argument count for a single String.fromCharCode(...spread) call.
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < svg.length; i += chunkSize) {
      binary += String.fromCharCode(...svg.subarray(i, i + chunkSize));
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  } catch {
    return undefined;
  }
}

async function resolvePickColors(convex: ConvexHttpClient, codes: string[]) {
  const drivers = await convex.query(api.drivers.listDrivers, {});
  const colorByCode = new Map(
    drivers.map((driver) => [
      driver.code,
      (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
    ]),
  );
  return codes.map((code) => ({
    code,
    color: colorByCode.get(code) ?? FALLBACK_TEAM_COLOR,
  }));
}
