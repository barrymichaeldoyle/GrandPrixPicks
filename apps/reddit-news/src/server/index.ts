import {
  context,
  createServer,
  getServerPort,
  reddit,
  redis,
} from '@devvit/web/server';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import {
  parseNewsResponse,
  syncNews,
  type RedditActions,
  type Store,
  type TrackedPost,
} from './sync';

const NEWS_URL = 'https://grandprixpicks.com/api/news/recent';
const POSTS_KEY = 'news:posts';
const SINCE_KEY = 'news:since';

const store: Store = {
  async getSince() {
    const value = await redis.get(SINCE_KEY);
    return value === undefined ? undefined : Number(value);
  },
  async setSince(since) {
    await redis.set(SINCE_KEY, String(since));
  },
  async getAll() {
    const raw = await redis.hGetAll(POSTS_KEY);
    return Object.fromEntries(
      Object.entries(raw).map(([id, json]) => [
        id,
        JSON.parse(json) as TrackedPost,
      ]),
    );
  },
  async put(id, post) {
    await redis.hSet(POSTS_KEY, { [id]: JSON.stringify(post) });
  },
  async remove(id) {
    await redis.hDel(POSTS_KEY, [id]);
  },
};

const redditActions: RedditActions = {
  async post(item) {
    const post = await reddit.submitPost({
      subredditName: context.subredditName,
      title: item.headline,
      url: item.sourceUrl,
    });
    try {
      const comment = await reddit.submitComment({
        id: post.id,
        text: item.body,
      });
      try {
        await comment.distinguish(true);
      } catch (error) {
        // Pinning needs the app account to be a moderator. The summary is
        // still there, just not on top.
        console.error('[gpp-news] pin failed', error);
      }
      return { postId: post.id, commentId: comment.id };
    } catch (error) {
      console.error('[gpp-news] summary comment failed', error);
      return { postId: post.id, commentId: null };
    }
  },
  async editComment(commentId, body) {
    const comment = await reddit.getCommentById(commentId as `t1_${string}`);
    await comment.edit({ text: body });
  },
  async deletePost(postId) {
    const post = await reddit.getPostById(postId as `t3_${string}`);
    await post.delete();
  },
};

const app = new Hono();

app.post('/internal/scheduler/sync-news', async (c) => {
  try {
    const response = await fetch(NEWS_URL);
    if (!response.ok) {
      throw new Error(`News endpoint answered ${response.status}`);
    }
    const items = parseNewsResponse(await response.json());
    const report = await syncNews({
      items,
      now: Date.now(),
      store,
      reddit: redditActions,
    });
    console.log('[gpp-news] sync', JSON.stringify(report));
  } catch (error) {
    console.error('[gpp-news] sync failed', error);
  }
  return c.json({ status: 'ok' }, 200);
});

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
