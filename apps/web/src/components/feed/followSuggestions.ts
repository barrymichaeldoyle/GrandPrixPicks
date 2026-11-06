import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from '@/integrations/convex/query';

type FeedPage = NonNullable<
  FunctionReturnType<typeof api.feed.getPersonalizedFeed>
>;

/**
 * Whether the activity stream is currently offering people to follow.
 *
 * The dashboard has two surfaces for the same people: the rail's "Players to
 * follow" card, and the stream, which offers them in its empty state and, for a
 * player who follows nobody, as a block after the first group. Both read the
 * same queries, so they used to collide: the identical list twice on one
 * screen, in two card shapes, with a pair of Follow buttons each. The rail card
 * stands down whenever this is true; see `SuggestedFollowsCard` at its call
 * site, and keep the rule here in step with the branches in `FeedContent`.
 *
 * Read from the same queries `FeedContent` branches on, rather than from
 * anything it reports upwards: all are already subscribed on this page, so
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
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const nearYou = useQuery(api.follows.getPlayersNearYou, { limit: 5 });
  const topPlayers = useQuery(api.leaderboards.getCombinedSeasonLeaderboard, {
    limit: 6,
  });

  if (page0 === undefined) {
    return false;
  }
  // The stream counts every event it loaded, before it drops the practice ones
  // for the block above it — an empty feed is empty of all of them.
  const feedIsEmpty = page0 === null || page0.events.length === 0;
  const followsNobody = (followedIds?.length ?? 0) === 0;
  const hasPeopleToOffer =
    (nearYou?.length ?? 0) > 0 ||
    (topPlayers?.entries ?? []).some((entry) => !entry.isViewer);

  if (feedIsEmpty && (suggested?.length ?? 0) > 0) {
    return true;
  }
  return followsNobody && hasPeopleToOffer;
}
