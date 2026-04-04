import { describe, expect, it, vi } from 'vitest';

import type { Id } from './_generated/dataModel';
import { buildFilteredFeedPage } from './feed';

const MAX_FEED_SIZE = 40;
const FEED_SCAN_BATCH_SIZE = MAX_FEED_SIZE;
const MAX_FEED_SCAN_BATCHES = 5;

type FeedEvent = {
  _id: Id<'feedEvents'>;
  type: 'joined_league';
  userId: Id<'users'>;
  revCount: number;
  createdAt: number;
};

function userId(id: string): Id<'users'> {
  return id as Id<'users'>;
}

function feedEventId(id: string): Id<'feedEvents'> {
  return id as Id<'feedEvents'>;
}

function makeEvent(id: string, owner: string, createdAt: number): FeedEvent {
  return {
    _id: feedEventId(id),
    type: 'joined_league',
    userId: userId(owner),
    revCount: 0,
    createdAt,
  };
}

function makeCtx(pagesByCreatedAt: Record<string, FeedEvent[]>) {
  const take = vi.fn(async (numItems: number) => {
    const range = queryRangeState.current;
    const key = range === null ? '__start__' : String(range);
    const page = pagesByCreatedAt[key];
    if (!page) {
      throw new Error(`Unexpected createdAt range ${key}`);
    }
    return page.slice(0, numItems);
  });

  const queryRangeState: { current: number | null } = { current: null };

  const ctx = {
    db: {
      query: vi.fn(() => ({
        withIndex: vi.fn(
          (
            _indexName: string,
            cb?: (q: {
              lte: (_field: string, value: number) => unknown;
            }) => unknown,
          ) => {
            queryRangeState.current = null;
            if (cb) {
              cb({
                lte: (_field: string, value: number) => {
                  queryRangeState.current = value;
                  return null;
                },
              });
            }
            return {
              order: vi.fn(() => ({
                take,
              })),
            };
          },
        ),
      })),
    },
  };

  return { ctx, take };
}

describe('buildFilteredFeedPage', () => {
  it('uses opaque cursors so same-timestamp events can appear on later pages', async () => {
    const allowed = userId('u1');
    const pagesByCreatedAt = {
      __start__: [
        ...Array.from({ length: MAX_FEED_SIZE }, (_, index) =>
          makeEvent(`page1-${index}`, 'u1', 1_000),
        ),
        makeEvent('page2-tied', 'u1', 1_000),
      ],
      '1000': [
        ...Array.from({ length: MAX_FEED_SIZE }, (_, index) =>
          makeEvent(`page1-${index}`, 'u1', 1_000),
        ),
        makeEvent('page2-tied', 'u1', 1_000),
      ],
    };

    const { ctx, take } = makeCtx(pagesByCreatedAt);

    const firstPage = await buildFilteredFeedPage(
      ctx as never,
      new Set([allowed]),
      null,
    );
    const secondPage = await buildFilteredFeedPage(
      ctx as never,
      new Set([allowed]),
      firstPage.nextCursor,
    );

    expect(firstPage.page).toHaveLength(MAX_FEED_SIZE);
    expect(firstPage.nextCursor).toBe(
      JSON.stringify({
        createdAt: 1_000,
        seenEventIdsAtCreatedAt: Array.from(
          { length: MAX_FEED_SIZE },
          (_, index) => `page1-${index}`,
        ),
      }),
    );
    expect(secondPage.page.map((event) => event._id)).toEqual([
      feedEventId('page2-tied'),
    ]);
    expect(secondPage.hasMore).toBe(false);
    expect(take).toHaveBeenNthCalledWith(
      1,
      FEED_SCAN_BATCH_SIZE * MAX_FEED_SCAN_BATCHES,
    );
    expect(take).toHaveBeenNthCalledWith(
      2,
      FEED_SCAN_BATCH_SIZE * MAX_FEED_SCAN_BATCHES + MAX_FEED_SIZE,
    );
  });

  it('keeps the global scan bounded when relevant events are sparse', async () => {
    const pagesByCreatedAt = {
      __start__: Array.from(
        { length: FEED_SCAN_BATCH_SIZE * MAX_FEED_SCAN_BATCHES },
        (_, index) =>
          makeEvent(
            `event-${index}`,
            index % FEED_SCAN_BATCH_SIZE === 0 ? 'allowed' : `other-${index}`,
            10_000 - index,
          ),
      ),
    };

    const { ctx, take } = makeCtx(pagesByCreatedAt);

    const result = await buildFilteredFeedPage(
      ctx as never,
      new Set([userId('allowed')]),
      null,
    );

    expect(result.page).toHaveLength(MAX_FEED_SCAN_BATCHES);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(
      JSON.stringify({
        createdAt: 9_801,
        seenEventIdsAtCreatedAt: ['event-199'],
      }),
    );
    expect(take).toHaveBeenCalledTimes(1);
  });

  it('treats an invalid cursor as a fresh feed request', async () => {
    const pagesByCreatedAt = {
      __start__: [makeEvent('fresh-1', 'u1', 2_000)],
    };

    const { ctx, take } = makeCtx(pagesByCreatedAt);

    const result = await buildFilteredFeedPage(
      ctx as never,
      new Set([userId('u1')]),
      'not-json',
    );

    expect(result.page.map((event) => event._id)).toEqual([
      feedEventId('fresh-1'),
    ]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(take).toHaveBeenCalledOnce();
  });

  it('carries a scan cursor forward when the first window has no allowed events', async () => {
    const pagesByCreatedAt = {
      __start__: Array.from(
        { length: FEED_SCAN_BATCH_SIZE * MAX_FEED_SCAN_BATCHES },
        (_, index) => makeEvent(`other-${index}`, 'other', 20_000 - index),
      ),
    };

    const { ctx } = makeCtx(pagesByCreatedAt);

    const result = await buildFilteredFeedPage(
      ctx as never,
      new Set([userId('allowed')]),
      null,
    );

    expect(result.page).toEqual([]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(
      JSON.stringify({
        createdAt: 19_801,
        seenEventIdsAtCreatedAt: ['other-199'],
      }),
    );
  });
});
