import { describe, expect, it, vi } from 'vitest';

import type { Id } from './_generated/dataModel';
import { buildFilteredFeedPage, getPersonalizedFeedPageData } from './feed';

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

function makeAsyncIterable<T>(values: T[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const value of values) {
        yield value;
      }
    },
  };
}

function makePersonalizedFeedCtx({
  events,
  followees,
  recentRevsByEventId = {},
  viewerRevEventIds = [],
}: {
  events: FeedEvent[];
  followees: Array<{ followeeId: Id<'users'> }>;
  recentRevsByEventId?: Record<
    string,
    Array<{
      userId: Id<'users'>;
      _id: Id<'users'>;
      username?: string;
      avatarUrl?: string;
    }>
  >;
  viewerRevEventIds?: string[];
}) {
  const query = vi.fn((table: string) => {
    if (table === 'follows') {
      return {
        withIndex: vi.fn(() => makeAsyncIterable(followees)),
      };
    }

    if (table === 'feedEvents') {
      return {
        withIndex: vi.fn(
          (
            _indexName: string,
            cb?: (q: {
              lte: (_field: string, value: number) => unknown;
            }) => unknown,
          ) => {
            let createdAtUpperBound: number | null = null;
            if (cb) {
              cb({
                lte: (_field: string, value: number) => {
                  createdAtUpperBound = value;
                  return null;
                },
              });
            }
            const filtered =
              createdAtUpperBound === null
                ? events
                : (() => {
                    const upperBound = createdAtUpperBound;
                    return events.filter(
                      (event) => event.createdAt <= upperBound,
                    );
                  })();
            return {
              order: vi.fn(() => ({
                take: vi.fn(async (numItems: number) =>
                  filtered.slice(0, numItems),
                ),
              })),
            };
          },
        ),
      };
    }

    if (table === 'revs') {
      return {
        withIndex: vi.fn(
          (
            indexName: string,
            cb: (q: {
              eq: (
                _field: string,
                value: string,
              ) => {
                eq: (_field: string, value: string) => unknown;
              };
            }) => unknown,
          ) => {
            let firstValue: string | null = null;
            let secondValue: string | null = null;
            cb({
              eq: (_field: string, value: string) => {
                firstValue = value;
                return {
                  eq: (_nextField: string, nextValue: string) => {
                    secondValue = nextValue;
                    return null;
                  },
                };
              },
            });

            if (indexName === 'by_user_event') {
              return {
                first: vi.fn(async () =>
                  secondValue && viewerRevEventIds.includes(secondValue)
                    ? { _id: 'rev-1' }
                    : null,
                ),
              };
            }

            if (indexName === 'by_event') {
              const revs =
                (firstValue && recentRevsByEventId[firstValue]) ?? [];
              return {
                order: vi.fn(() => ({
                  take: vi.fn(async (limit: number) => revs.slice(0, limit)),
                })),
              };
            }

            throw new Error(`Unexpected rev index ${indexName}`);
          },
        ),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  const usersById = Object.fromEntries(
    Object.values(recentRevsByEventId)
      .flat()
      .map((user) => [user.userId, user]),
  );

  return {
    db: {
      get: vi.fn(async (id: Id<'users'>) => usersById[id] ?? null),
      query,
    },
  };
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

describe('getPersonalizedFeedPageData', () => {
  it('returns only viewer/followed events and preserves nextCursor for load more', async () => {
    const viewer = {
      _id: userId('viewer'),
      clerkUserId: 'viewer',
      createdAt: 0,
      updatedAt: 0,
    };
    const ctx = makePersonalizedFeedCtx({
      followees: [{ followeeId: userId('followed') }],
      events: [
        makeEvent('event-1', 'followed', 300),
        makeEvent('event-2', 'other', 200),
        makeEvent('event-3', 'viewer', 100),
      ],
    });

    const result = await getPersonalizedFeedPageData(
      ctx as never,
      viewer as never,
      null,
    );

    expect(result.events.map((event) => event._id)).toEqual([
      feedEventId('event-1'),
      feedEventId('event-3'),
    ]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.sessions).toEqual({});
  });

  it('applies viewer rev state and recent rev users to joined league events', async () => {
    const viewer = {
      _id: userId('viewer'),
      clerkUserId: 'viewer',
      createdAt: 0,
      updatedAt: 0,
    };
    const recentRevUser = {
      _id: userId('rev-user'),
      userId: userId('rev-user'),
      username: 'revver',
      avatarUrl: 'https://example.com/avatar.png',
    };
    const ctx = makePersonalizedFeedCtx({
      followees: [{ followeeId: userId('followed') }],
      events: [makeEvent('event-1', 'followed', 300)],
      recentRevsByEventId: {
        'event-1': [recentRevUser],
      },
      viewerRevEventIds: ['event-1'],
    });

    const result = await getPersonalizedFeedPageData(
      ctx as never,
      viewer as never,
      null,
    );

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      _id: feedEventId('event-1'),
      viewerHasReved: true,
      recentRevUsers: [
        {
          userId: userId('rev-user'),
          username: 'revver',
          avatarUrl: 'https://example.com/avatar.png',
        },
      ],
    });
  });
});
