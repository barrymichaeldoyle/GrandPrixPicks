import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { useMobileConfig } from '../../providers/mobile-config';
import { NewsRun, RaceNewsCard } from '../feed/NewsGroupCard';

/**
 * The next race's news for a visitor with no account.
 *
 * A signed-in player gets these stories as feed cards. The feed is
 * viewer-scoped and answers a guest with nothing, so the one thing on Home
 * that changes week to week was missing from the screen that has to sell the
 * app signed out. Same source as the write-up pages (`raceNews.list`), same
 * cards as the feed, so the two readers see the same story.
 *
 * Renders nothing when the weekend has no selected news yet, which is most of
 * the week before a race.
 */
export function GuestWeekendNews({
  raceName,
  raceSlug,
}: {
  raceName: string;
  raceSlug: string;
}) {
  const { convexEnabled } = useMobileConfig();
  const news = useQuery(
    api.raceNews.list,
    convexEnabled ? { raceSlug } : 'skip',
  );
  const items = news?.items ?? [];
  if (items.length === 0) {
    return null;
  }

  return (
    <NewsRun
      entries={items.map((item) => {
        const story = {
          id: item.key,
          key: item.key,
          headline: item.headline,
          body: item.body,
          publishedAt: item.publishedAt,
          sourceName: item.sourceName,
          sourceUrl: item.sourceUrl,
          team: item.drivers[0]?.team ?? null,
          startingGrid: item.startingGrid,
          raceName,
        };
        return {
          id: item.key,
          story,
          render: (foldable: boolean, reverse: boolean) => (
            <RaceNewsCard
              foldable={foldable}
              grouped
              reverse={reverse}
              story={story}
            />
          ),
        };
      })}
      raceName={raceName}
      raceSlug={raceSlug}
    />
  );
}
