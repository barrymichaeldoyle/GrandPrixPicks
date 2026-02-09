import { ConvexHttpClient } from 'convex/browser';
import { defineEventHandler, getRouterParam, setHeaders } from 'nitro/h3';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { renderOgImage } from '../../../../src/lib/og/renderer';
import { raceTemplate } from '../../../../src/lib/og/templates';

// eslint-disable-next-line no-restricted-syntax -- Nitro server routes require default exports
export default defineEventHandler(async (event) => {
  const raceId = getRouterParam(event, 'raceId') as Id<'races'> | undefined;
  if (!raceId) {
    return new Response('Missing raceId', { status: 400 });
  }

  const convexUrl =
    process.env.VITE_CONVEX_URL ?? import.meta.env.VITE_CONVEX_URL;
  const convex = new ConvexHttpClient(convexUrl as string);
  const race = await convex.query(api.races.getRace, { raceId });

  if (!race) {
    return new Response('Race not found', { status: 404 });
  }

  const png = await renderOgImage(
    raceTemplate({
      name: race.name,
      round: race.round,
      season: race.season,
      raceStartAt: race.raceStartAt,
      hasSprint: race.hasSprint,
      status: race.status,
    }),
  );

  setHeaders(event, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, s-maxage=86400, max-age=3600',
  });

  return png;
});
