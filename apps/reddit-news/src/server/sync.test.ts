import { describe, expect, it } from 'vitest';

import {
  BACKFILL_MS,
  MAX_NEW_PER_RUN,
  TRACK_MS,
  parseNewsResponse,
  syncNews,
  type NewsItem,
  type RedditActions,
  type Store,
  type TrackedPost,
} from './sync';

const NOW = Date.UTC(2026, 8, 30, 12);
const HOUR = 60 * 60 * 1000;

function item(id: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    headline: `Headline ${id}`,
    body: `Body ${id}.`,
    sourceName: 'Formula 1',
    sourceUrl: `https://www.formula1.com/${id}`,
    raceSlug: 'bahrain-2026',
    createdAt: NOW - HOUR,
    ...overrides,
  };
}

function setup(since: number | undefined = NOW - BACKFILL_MS) {
  const state: { since?: number; posts: Record<string, TrackedPost> } = {
    since,
    posts: {},
  };
  const calls: string[] = [];
  let next = 0;
  const store: Store = {
    getSince: async () => state.since,
    setSince: async (value) => {
      state.since = value;
    },
    getAll: async () => ({ ...state.posts }),
    put: async (id, post) => {
      state.posts[id] = post;
    },
    remove: async (id) => {
      delete state.posts[id];
    },
  };
  const reddit: RedditActions = {
    post: async (news) => {
      next += 1;
      calls.push(`post ${news.id}`);
      return { postId: `t3_${next}`, commentId: `t1_${next}` };
    },
    editComment: async (commentId, body) => {
      calls.push(`edit ${commentId} ${body}`);
    },
    deletePost: async (postId) => {
      calls.push(`delete ${postId}`);
    },
  };
  function run(items: NewsItem[], now = NOW) {
    return syncNews({ items, now, store, reddit, log: () => {} });
  }
  return { state, calls, run, reddit };
}

describe('syncNews', () => {
  it('starts a day back on the first run and skips older items', async () => {
    const { state, calls, run } = setup(undefined);

    await run([item('old', { createdAt: NOW - 2 * BACKFILL_MS }), item('new')]);

    expect(state.since).toBe(NOW - BACKFILL_MS);
    expect(calls).toEqual(['post new']);
  });

  it('posts each item once', async () => {
    const { calls, run } = setup();
    const items = [item('a')];

    await run(items);
    await run(items);

    expect(calls).toEqual(['post a']);
  });

  it('posts oldest first and caps each run', async () => {
    const { calls, run } = setup();
    const items = Array.from({ length: MAX_NEW_PER_RUN + 2 }, (_, i) =>
      item(`n${i}`, { createdAt: NOW - HOUR * (10 - i) }),
    ).reverse();

    await run(items);
    expect(calls).toEqual(
      Array.from({ length: MAX_NEW_PER_RUN }, (_, i) => `post n${i}`),
    );

    await run(items);
    expect(calls.slice(MAX_NEW_PER_RUN)).toEqual([
      `post n${MAX_NEW_PER_RUN}`,
      `post n${MAX_NEW_PER_RUN + 1}`,
    ]);
  });

  it('edits the comment when only the summary changes', async () => {
    const { calls, run, state } = setup();
    await run([item('a')]);

    await run([item('a', { body: 'Corrected.' })]);

    expect(calls).toEqual(['post a', 'edit t1_1 Corrected.']);
    expect(state.posts.a?.body).toBe('Corrected.');
  });

  it('reposts when the headline or link changes', async () => {
    const { calls, run } = setup();
    await run([item('a')]);

    await run([item('a', { headline: 'Corrected headline' })]);
    await run([item('a', { sourceUrl: 'https://www.the-race.com/a' })]);

    expect(calls).toEqual([
      'post a',
      'delete t3_1',
      'post a',
      'delete t3_2',
      'post a',
    ]);
  });

  it('deletes the post when an item leaves the list', async () => {
    const { calls, run, state } = setup();
    await run([item('a'), item('b')]);

    await run([item('b')]);

    expect(calls).toEqual(['post a', 'post b', 'delete t3_1']);
    expect(Object.keys(state.posts)).toEqual(['b']);
  });

  it('never deletes on an empty list', async () => {
    const { calls, run, state } = setup();
    await run([item('a')]);

    await run([]);

    expect(calls).toEqual(['post a']);
    expect(Object.keys(state.posts)).toEqual(['a']);
  });

  it('stops tracking a post after a week without deleting it', async () => {
    const { calls, run, state } = setup();
    await run([item('a')]);

    await run([item('b', { createdAt: NOW + TRACK_MS })], NOW + TRACK_MS);

    expect(calls).toEqual(['post a', 'post b']);
    expect(Object.keys(state.posts)).toEqual(['b']);
  });

  it('carries on past a failed post and retries it next run', async () => {
    const { calls, run, reddit } = setup();
    const post = reddit.post;
    reddit.post = async (news) => {
      if (news.id === 'a') {
        throw new Error('rate limited');
      }
      return post(news);
    };

    const report = await run([item('a'), item('b')]);
    expect(report.failed).toEqual(['a']);
    expect(calls).toEqual(['post b']);

    reddit.post = post;
    await run([item('a'), item('b')]);
    expect(calls).toEqual(['post b', 'post a']);
  });

  it('forgets a post whose delete fails', async () => {
    const { run, reddit, state } = setup();
    await run([item('a'), item('b')]);
    reddit.deletePost = async () => {
      throw new Error('already removed');
    };

    const report = await run([item('b')]);

    expect(report.failed).toEqual(['a']);
    expect(Object.keys(state.posts)).toEqual(['b']);
  });
});

describe('parseNewsResponse', () => {
  it('reads the endpoint shape', () => {
    expect(parseNewsResponse({ items: [item('a')] })).toEqual([item('a')]);
  });

  it.each([
    null,
    {},
    { items: [{ ...item('a'), createdAt: '1' }] },
    { items: [{ ...item('a'), sourceUrl: 'javascript:alert(1)' }] },
  ])('rejects %j', (json) => {
    expect(() => parseNewsResponse(json)).toThrow();
  });
});
