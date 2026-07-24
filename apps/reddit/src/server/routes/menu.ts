import { context } from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';
import { Hono } from 'hono';
import { createRacePost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createRacePost();
    return c.json<UiResponse>({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error('Failed to create race post', error);
    return c.json<UiResponse>(
      { showToast: 'Could not create the Grand Prix Picks post.' },
      400,
    );
  }
});
