import { api } from '@convex-generated/api';
import { useConvexAuth } from 'convex/react';
import { createContext, type ReactNode, useContext } from 'react';

import { useQuery } from '@/integrations/convex/query';

/**
 * The viewer's follow state, read once for the whole board.
 *
 * Every row carries a Follow button, and a button that fetched its own state
 * would be one subscription per row, fifty to a page. The board reads the
 * followed ids once and each row looks itself up. `null` means "no follow
 * column": a signed-out visitor (there is nobody to follow as), or a board
 * rendered outside the leaderboard page, where the context is absent.
 */
const FollowColumnContext = createContext<ReadonlySet<string> | null>(null);

export function FollowColumnProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const followedIds = useQuery(
    api.follows.getViewerFollowedIds,
    isAuthenticated ? {} : 'skip',
  );
  const value =
    isAuthenticated && followedIds !== undefined ? new Set(followedIds) : null;
  return (
    <FollowColumnContext.Provider value={value}>
      {children}
    </FollowColumnContext.Provider>
  );
}

export function useFollowColumn() {
  return useContext(FollowColumnContext);
}
