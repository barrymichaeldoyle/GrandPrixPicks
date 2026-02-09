import { ConvexHttpClient } from 'convex/browser';
import { defineEventHandler, getRouterParam, setHeaders } from 'nitro/h3';

import { api } from '../../../../convex/_generated/api';
import { renderOgImage } from '../../../../src/lib/og/renderer';
import { profileTemplate } from '../../../../src/lib/og/templates';

// eslint-disable-next-line no-restricted-syntax -- Nitro server routes require default exports
export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username');
  if (!username) {
    return new Response('Missing username', { status: 400 });
  }

  const convexUrl =
    process.env.VITE_CONVEX_URL ?? import.meta.env.VITE_CONVEX_URL;
  const convex = new ConvexHttpClient(convexUrl as string);
  const data = await convex.query(api.users.getProfileOgData, { username });

  if (!data) {
    return new Response('User not found', { status: 404 });
  }

  const png = await renderOgImage(
    profileTemplate({
      displayName: data.displayName,
      username: data.username,
      avatarUrl: data.avatarUrl,
      totalPoints: data.totalPoints,
      seasonRank: data.seasonRank,
      totalPlayers: data.totalPlayers,
      weekendCount: data.weekendCount,
    }),
  );

  setHeaders(event, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, s-maxage=3600, max-age=600',
  });

  return png;
});
