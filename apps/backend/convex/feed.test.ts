import { describe, expect, it, vi } from 'vitest';

import type { Id } from './_generated/dataModel';
import {
  FEED_SCAN_BATCH_SIZE,
  MAX_FEED_SCAN_BATCHES,
  MAX_FEED_SIZE,
  buildFilteredFeedPage,
} from './feed';

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

function makeCtx(
  pagesByCursor: Record<
    string,
    { page: FeedEvent[]; isDone: boolean; continueCursor: string | null }
  >,
) {
  const paginate = vi.fn(async ({ cursor }: { cursor: string | null }) => {
    const key = cursor ?? '__start__';
    const page = pagesByCursor[key];
    if (!page) {
      throw new Error(`Unexpected cursor ${key}`);
    }
    return page;
  });

  const ctx = {
    db: {
      query: vi.fn(() => ({
        withIndex: vi.fn(() => ({
          order: vi.fn(() => ({
            paginate,
          })),
        })),
      })),
    },
  };

  return { ctx, paginate };
}

describe('buildFilteredFeedPage', () => {
  it('uses opaque cursors so same-timestamp events can appear on later pages', async () => {
    const allowed = userId('u1');
    const pagesByCursor = {
      __start__: {
        page: Array.from({ length: MAX_FEED_SIZE }, (_, index) =>
          makeEvent(`page1-${index}`, 'u1', 1_000),
        ),
        isDone: false,
        continueCursor: 'cursor-page-2',
      },
      'cursor-page-2': {
        page: [makeEvent('page2-tied', 'u1', 1_000)],
        isDone: true,
        continueCursor: null,
      },
    };

    const { ctx, paginate } = makeCtx(pagesByCursor);

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
    expect(firstPage.nextCursor).toBe('cursor-page-2');
    expect(secondPage.page.map((event) => event._id)).toEqual([
      feedEventId('page2-tied'),
    ]);
    expect(secondPage.hasMore).toBe(false);
    expect(paginate).toHaveBeenNthCalledWith(1, {
      cursor: null,
      numItems: FEED_SCAN_BATCH_SIZE,
    });
    expect(paginate).toHaveBeenNthCalledWith(2, {
      cursor: 'cursor-page-2',
      numItems: FEED_SCAN_BATCH_SIZE,
    });
  });

  it('keeps the global scan bounded when relevant events are sparse', async () => {
    const pagesByCursor: Record<
      string,
      { page: FeedEvent[]; isDone: boolean; continueCursor: string | null }
    > = {};

    for (let batch = 0; batch < MAX_FEED_SCAN_BATCHES; batch += 1) {
      const cursor = batch === 0 ? '__start__' : `cursor-${batch}`;
      const nextCursor =
        batch === MAX_FEED_SCAN_BATCHES - 1 ? `cursor-${batch + 1}` : `cursor-${batch + 1}`;
      pagesByCursor[cursor] = {
        page: Array.from({ length: FEED_SCAN_BATCH_SIZE }, (_, index) =>
          makeEvent(
            `batch-${batch}-${index}`,
            index === 0 ? 'allowed' : `other-${batch}-${index}`,
            10_000 - batch * FEED_SCAN_BATCH_SIZE - index,
          ),
        ),
        isDone: false,
        continueCursor: nextCursor,
      };
    }

    const { ctx, paginate } = makeCtx(pagesByCursor);

    const result = await buildFilteredFeedPage(
      ctx as never,
      new Set([userId('allowed')]),
      null,
    );

    expect(result.page).toHaveLength(MAX_FEED_SCAN_BATCHES);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(`cursor-${MAX_FEED_SCAN_BATCHES}`);
    expect(paginate).toHaveBeenCalledTimes(MAX_FEED_SCAN_BATCHES);
  });
});
