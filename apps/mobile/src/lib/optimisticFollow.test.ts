import { describe, expect, it } from 'vitest';

import { api } from '../integrations/convex/api';
import { applyFollowToStore, type FollowQueryStore } from './optimisticFollow';

function createStore(
  initial: Map<string, unknown> = new Map(),
): FollowQueryStore {
  const snapshot = new Map(initial);
  return {
    getQuery(query, args) {
      return snapshot.get(JSON.stringify([query, args])) as never;
    },
    setQuery(query, args, value) {
      snapshot.set(JSON.stringify([query, args]), value);
    },
  };
}

const followeeId = 'users:abc' as Parameters<typeof applyFollowToStore>[1];

describe('applyFollowToStore', () => {
  it('flips isFollowing and bumps the follower count', () => {
    const store = createStore();
    store.setQuery(api.follows.isFollowing, { followeeId }, false);
    store.setQuery(
      api.follows.getFollowCounts,
      { userId: followeeId },
      { followerCount: 4, followingCount: 2 },
    );

    applyFollowToStore(store, followeeId, true);

    expect(store.getQuery(api.follows.isFollowing, { followeeId })).toBe(true);
    expect(
      store.getQuery(api.follows.getFollowCounts, { userId: followeeId }),
    ).toEqual({ followerCount: 5, followingCount: 2 });
  });

  it('does not double-count when the cache already says following', () => {
    const store = createStore();
    store.setQuery(api.follows.isFollowing, { followeeId }, true);
    store.setQuery(
      api.follows.getFollowCounts,
      { userId: followeeId },
      { followerCount: 4, followingCount: 2 },
    );

    applyFollowToStore(store, followeeId, true);

    expect(
      store.getQuery(api.follows.getFollowCounts, { userId: followeeId }),
    ).toEqual({ followerCount: 4, followingCount: 2 });
  });

  it('adds and removes the id on the viewer follow list', () => {
    const store = createStore();
    store.setQuery(api.follows.isFollowing, { followeeId }, false);
    store.setQuery(api.follows.getViewerFollowedIds, {}, ['users:other']);

    applyFollowToStore(store, followeeId, true);
    expect(store.getQuery(api.follows.getViewerFollowedIds, {})).toEqual([
      'users:other',
      String(followeeId),
    ]);

    applyFollowToStore(store, followeeId, false);
    expect(store.getQuery(api.follows.getViewerFollowedIds, {})).toEqual([
      'users:other',
    ]);
  });

  it('floors followerCount at 0', () => {
    const store = createStore();
    store.setQuery(api.follows.isFollowing, { followeeId }, true);
    store.setQuery(
      api.follows.getFollowCounts,
      { userId: followeeId },
      { followerCount: 0, followingCount: 1 },
    );

    applyFollowToStore(store, followeeId, false);

    expect(
      store.getQuery(api.follows.getFollowCounts, { userId: followeeId })
        ?.followerCount,
    ).toBe(0);
  });
});
