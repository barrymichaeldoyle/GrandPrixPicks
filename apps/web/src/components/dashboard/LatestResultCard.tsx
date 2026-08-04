import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight, Trophy } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { Button } from '@/components/Button/Button';
import { NoticeCard } from '@/components/NoticeCard';
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
  compact = false,
  hideWhenEmpty = false,
}: {
  weekend: HistoryWeekend | undefined;
  leaderboard: RaceLeaderboard | undefined;
  loading: boolean;
  compact?: boolean;
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
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-5 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          {Array.from({ length: compact ? 2 : 4 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-sm bg-surface-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!weekend) {
    return hideWhenEmpty ? null : (
      <NoticeCard
        level="section"
        icon={Trophy}
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
      className="overflow-hidden rounded-lg border border-border bg-surface"
      aria-labelledby="latest-result-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="gpp-label">Latest result</p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            {countryCode ? (
              <RaceFlag
                countryCode={countryCode}
                size="sm"
                className="shrink-0 overflow-hidden rounded-sm border border-border"
              />
            ) : null}
            <h2
              id="latest-result-heading"
              className="truncate font-semibold text-text"
            >
              {weekend.raceName}
            </h2>
          </div>
        </div>
        <Button asChild variant="text" size="sm" rightIcon={ArrowRight}>
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: weekend.raceSlug }}
            search={{ from: 'home' }}
          >
            Full breakdown
          </Link>
        </Button>
      </div>
      <div
        className={`grid gap-px bg-border ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}
      >
        <ResultStat value={totalPoints} label="Combined" accent />
        <ResultStat
          value={rank != null ? `P${rank}` : '—'}
          label={fieldSize > 0 ? `of ${fieldSize}` : 'Rank'}
        />
        {compact ? null : (
          <>
            <ResultStat
              value={viewerEntry?.top5Points ?? weekend.totalPoints}
              label="Top 5"
            />
            <ResultStat value={viewerEntry?.h2hPoints ?? '—'} label="H2H" />
          </>
        )}
      </div>
    </section>
  );
}

function ResultStat({
  value,
  label,
  accent = false,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-elevated px-3 py-3 text-center">
      <p
        className={`font-title text-xl font-semibold ${accent ? 'text-accent' : 'text-text'}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold tracking-label text-text-muted uppercase">
        {label}
      </p>
    </div>
  );
}
