import { useMutation } from 'convex/react';

import { api } from '../integrations/convex/api';
import { applyFollowToStore } from '../lib/optimisticFollow';

export function useFollowMutations() {
  const follow = useMutation(api.follows.follow).withOptimisticUpdate(
    (store, args) => {
      applyFollowToStore(store, args.followeeId, true);
    },
  );
  const unfollow = useMutation(api.follows.unfollow).withOptimisticUpdate(
    (store, args) => {
      applyFollowToStore(store, args.followeeId, false);
    },
  );
  return { follow, unfollow };
}
