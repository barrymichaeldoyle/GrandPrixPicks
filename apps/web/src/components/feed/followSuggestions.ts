import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from '@/integrations/convex/query';

type FeedPage = NonNullable<
  FunctionReturnType<typeof api.feed.getPersonalizedFeed>
>;

/**
 * Whether the activity stream is currently offering people to follow.
 *
 * The dashboard has two surfaces for the same three people: the rail's
 * "Players to follow" card, and the stream's empty state, which is the same
 * query with the same limit. They can only collide in one situation — an empty
 * feed — and there they did: the identical list twice on one screen, in two
 * different card shapes, with a pair of Follow buttons each. The rail card
 * stands down for that one case; see `SuggestedFollowsCard` at its call site.
 *
 * Read from the same two queries `FeedContent` branches on, rather than from
 * anything it reports upwards: both are already subscribed on this page, so
 * this is the state that is on screen, not a second guess at it.
 */
export function useFeedOffersFollows(initialPage?: FeedPage | null): boolean {
  // `!== undefined` rather than `??`, matching `FeedContent`: null is a real
  // answer (no viewer) and only "has not answered yet" falls back to the seed.
  const livePage0 = useQuery(api.feed.getPersonalizedFeed, {});
  const page0 = livePage0 !== undefined ? livePage0 : initialPage;
  const suggested = useQuery(api.follows.getSuggestedLeagueMembersToFollow, {
    limit: 3,
  });

  if (page0 === undefined) {
    return false;
  }
  // The stream counts every event it loaded, before it drops the practice ones
  // for the block above it — an empty feed is empty of all of them.
  const feedIsEmpty = page0 === null || page0.events.length === 0;
  return feedIsEmpty && (suggested?.length ?? 0) > 0;
}
