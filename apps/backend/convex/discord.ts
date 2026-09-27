import { v } from 'convex/values';

import { internalAction } from './_generated/server';

/**
 * Post a news item's feed card to the #news Discord channel.
 *
 * Env-gated, failures swallowed on purpose, same pattern as `indexNow.ts`:
 * this runs off the back of a mutation commit, and no Discord post is worth
 * failing that. Without `DISCORD_NEWS_WEBHOOK_URL` set this is a no-op, which
 * is what dev wants — a dev deployment posting to the prod #news channel
 * would be worse than not posting at all. See `docs/discord-server-setup.md`.
 */
export const postNews = internalAction({
  args: {
    headline: v.string(),
    sourceName: v.string(),
    feedEventId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const webhookUrl = process.env.DISCORD_NEWS_WEBHOOK_URL;
    if (!webhookUrl) {
      return null;
    }

    const appUrl = process.env.APP_URL ?? 'https://grandprixpicks.com';
    const link = `${appUrl}/feed/${args.feedEventId}?utm_source=discord&utm_campaign=news`;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: args.headline,
              url: link,
              footer: { text: args.sourceName },
            },
          ],
          allowed_mentions: { parse: [] },
        }),
      });

      if (!response.ok) {
        console.error(
          `[discord] postNews ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error('[discord] postNews failed', error);
    }

    return null;
  },
});
