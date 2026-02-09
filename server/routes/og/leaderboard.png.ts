import { ConvexHttpClient } from 'convex/browser';
import { defineEventHandler, setHeaders } from 'nitro/h3';

import { api } from '../../../convex/_generated/api';
import { renderOgImage } from '../../../src/lib/og/renderer';
import { leaderboardTemplate } from '../../../src/lib/og/templates';

// eslint-disable-next-line no-restricted-syntax -- Nitro server routes require default exports
export default defineEventHandler(async (event) => {
  const convexUrl =
    process.env.VITE_CONVEX_URL ?? import.meta.env.VITE_CONVEX_URL;
  const convex = new ConvexHttpClient(convexUrl as string);

  const leaderboard = await convex.query(
    api.leaderboards.getSeasonLeaderboard,
    { limit: 3 },
  );

  const entries = leaderboard.entries.map((entry) => ({
    rank: entry.rank,
    username: entry.username,
    points: entry.points,
  }));

  const png = await renderOgImage(leaderboardTemplate(entries));

  setHeaders(event, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, s-maxage=3600, max-age=600',
  });

  return png;
});
