import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from 'convex/server';

import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';

/**
 * The get/set slice of Convex's optimistic local store. The real store has
 * more methods; this is the surface follow mutations need.
 */
export type FollowQueryStore = {
  getQuery<Query extends FunctionReference<'query'>>(
    query: Query,
    args: FunctionArgs<Query>,
  ): FunctionReturnType<Query> | undefined;
  setQuery<Query extends FunctionReference<'query'>>(
    query: Query,
    args: FunctionArgs<Query>,
    value: FunctionReturnType<Query>,
  ): void;
};

/**
 * Flip every follow query the client already has for this person, so Follow
 * does not wait on the mutation round-trip. Skips the count bump when the
 * cache already matches, because `follows.follow` is idempotent.
 */
export function applyFollowToStore(
  store: FollowQueryStore,
  followeeId: ConvexId<'users'>,
  following: boolean,
) {
  const current = store.getQuery(api.follows.isFollowing, { followeeId });
  if (current === following) {
    return;
  }

  store.setQuery(api.follows.isFollowing, { followeeId }, following);

  const ids = store.getQuery(api.follows.getViewerFollowedIds, {});
  if (ids !== undefined) {
    const id = String(followeeId);
    const has = ids.includes(id);
    if (following && !has) {
      store.setQuery(api.follows.getViewerFollowedIds, {}, [...ids, id]);
    } else if (!following && has) {
      store.setQuery(
        api.follows.getViewerFollowedIds,
        {},
        ids.filter((followedId) => followedId !== id),
      );
    }
  }

  const counts = store.getQuery(api.follows.getFollowCounts, {
    userId: followeeId,
  });
  if (counts) {
    store.setQuery(
      api.follows.getFollowCounts,
      { userId: followeeId },
      {
        ...counts,
        followerCount: Math.max(0, counts.followerCount + (following ? 1 : -1)),
      },
    );
  }
}
