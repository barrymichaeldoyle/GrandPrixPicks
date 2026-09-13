import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';
import { ExternalLink } from 'lucide-react';

import { ScoringPolicyNote } from '@/components/ScoringPolicyNote';
import { StartingGridTable } from '@/components/StartingGridTable';
import { newsMentionsGridPenalty } from '@/lib/newsGridPenalty';

/**
 * The confirmed grid, right under the picks card, on the one weekend a race
 * news item actually published one — a penalty or a missed qualifying
 * session is the one fact most likely to change a Top 5 written before it
 * broke, so it belongs beside the card a player is about to edit rather than
 * further down the feed among news that does not.
 *
 * Reads `raceNews.list` directly rather than the feed: the feed only carries
 * this weekend's *events*, in arrival order among everything else that
 * happened, and there is no guarantee the grid item is anywhere near the top
 * of it by the time a player is back here making picks. This card asks the
 * one question it exists to answer — has the grid for the *next* race been
 * published — and renders nothing when the answer is no, which is most
 * weekends.
 *
 * Same `StartingGridTable`, same `compact` mode the feed and the write-up
 * grid card use: one component, so a correction to the grid cannot read
 * differently depending on which surface a player is looking at.
 */
export function DashboardStartingGridCard({ raceSlug }: { raceSlug: string }) {
  const news = useQuery(api.raceNews.list, { raceSlug });
  const gridItem = news?.items.find(
    (item) => (item.startingGrid?.length ?? 0) > 0,
  );

  if (!gridItem?.startingGrid) {
    return null;
  }

  return (
    <section
      aria-labelledby="dashboard-grid-heading"
      data-testid="dashboard-starting-grid"
      className="overflow-hidden border-y border-border/80 bg-surface max-md:-mx-4 max-md:pt-2 md:rounded-sm md:border"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <h2
          id="dashboard-grid-heading"
          className="text-xs font-medium text-accent"
        >
          Starting Grid
        </h2>
        {gridItem.sourceUrl && gridItem.sourceName ? (
          <a
            href={gridItem.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="gpp-touch-target inline-flex shrink-0 items-center gap-1 text-sm text-text-muted hover:text-text"
          >
            {gridItem.sourceName}
            <ExternalLink className="size-3 shrink-0" aria-hidden />
          </a>
        ) : null}
      </div>
      <p className="px-4 text-sm font-semibold text-text">
        {gridItem.headline}
      </p>
      <div className="px-2 pb-3 sm:px-3">
        <StartingGridTable entries={gridItem.startingGrid} compact />
      </div>
      {newsMentionsGridPenalty(gridItem) ? (
        <ScoringPolicyNote className="px-4 pb-3 text-xs text-text-muted" />
      ) : null}
    </section>
  );
}
