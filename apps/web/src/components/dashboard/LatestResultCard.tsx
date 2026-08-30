import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight, Flag } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { NoticeCard } from '@/components/NoticeCard';
import { InlineLoader } from '@/components/InlineLoader';
import { RaceFlag } from '@/components/RaceFlag';
import { getCountryCodeForRace } from '@/lib/raceCountries';

type HistoryWeekend = FunctionReturnType<
  typeof api.predictions.getUserPredictionHistory
>[number];

type RaceLeaderboard = FunctionReturnType<
  typeof api.leaderboards.getCombinedRaceLeaderboard
>;

export function LatestResultCard({
  weekend,
  leaderboard,
  loading,
  hideWhenEmpty = false,
}: {
  weekend: HistoryWeekend | undefined;
  leaderboard: RaceLeaderboard | undefined;
  loading: boolean;
  /**
   * Render nothing until there is a result, instead of the placeholder.
   *
   * For the mobile stack. In a desktop rail the placeholder earns its place by
   * filling a column that would otherwise look broken, but on a phone the rail
   * cards become a vertical run below the picks card, and a card that only
   * promises a future result is a screen the player scrolls past for nothing.
   */
  hideWhenEmpty?: boolean;
}) {
  // Skip the skeleton too when hiding: showing one and then removing it would
  // shift the content underneath for a card that was never going to appear.
  if (loading && hideWhenEmpty) {
    return null;
  }

  if (loading) {
    return (
      <div
        className="rounded-lg border border-border bg-surface p-4"
        aria-label="Loading latest result"
        aria-busy="true"
      >
        <LatestResultHeading />
        <InlineLoader
          label="Loading latest result"
          className="mt-3 h-[4.5rem]"
          size="sm"
        />
      </div>
    );
  }

  if (!weekend) {
    return hideWhenEmpty ? null : (
      <NoticeCard
        level="section"
        icon={Flag}
        title="Your first result will land here"
        description="Once a session is scored, this becomes the quick view of your points and weekend position."
      />
    );
  }

  const viewerEntry =
    leaderboard?.status === 'visible'
      ? leaderboard.entries.find((entry) => entry.isViewer)
      : null;
  const totalPoints = viewerEntry?.points ?? weekend.totalPoints;
  const rank = viewerEntry?.rank ?? weekend.top5Rank;
  const fieldSize =
    leaderboard?.status === 'visible'
      ? leaderboard.entries.length
      : weekend.top5FieldSize;
  const countryCode = getCountryCodeForRace({ slug: weekend.raceSlug });

  return (
    <section
      className="rounded-lg border border-border bg-surface p-4"
      aria-labelledby="latest-result-heading"
    >
      <LatestResultHeading />

      <div className="mt-3 flex min-w-0 items-center gap-2">
        {countryCode ? (
          <RaceFlag
            countryCode={countryCode}
            size="sm"
            className="shrink-0 overflow-hidden rounded-sm border border-border"
          />
        ) : null}
        <p className="truncate text-sm font-semibold text-text">
          {weekend.raceName}
        </p>
      </div>

      {/* Same shape as the season standing card one rail over: the number that
          matters at title size on the left, position as a quiet mono line on
          the right, so the two cards read as one family.

          No label under the points. It used to say "Combined", which is how
          the leaderboard code names the Top 5 + H2H sum, not how a player
          thinks about the weekend they just played: on a card headed "Latest
          result" for one named race, the points are simply the result. */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-title text-3xl font-semibold text-accent">
          {totalPoints}
          <span className="ml-1 text-sm font-medium text-text-muted">pts</span>
        </p>
        <p className="gpp-mono text-sm font-medium text-text">
          {rank == null ? (
            '—'
          ) : (
            <>
              P{rank}
              {fieldSize > 0 ? (
                <span className="text-text-muted"> of {fieldSize}</span>
              ) : null}
            </>
          )}
        </p>
      </div>

      {/* A bottom link, not a header button. In a rail this narrow the old
          header row wrapped, leaving the link stranded in a band of empty
          card. */}
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug: weekend.raceSlug }}
        search={{ from: 'home' }}
        // Matches the season standing card: 17px of text is a fine mouse
        // target and a poor thumb one, so coarse pointers get the 44px row
        // and give most of the top margin back.
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover pointer-coarse:mt-2 pointer-coarse:min-h-11"
      >
        Full breakdown
        <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </section>
  );
}

function LatestResultHeading() {
  return (
    <div className="flex items-center gap-2">
      <Flag className="h-4 w-4 text-accent" aria-hidden />
      <h2 id="latest-result-heading" className="gpp-label text-text-muted">
        Latest result
      </h2>
    </div>
  );
}
