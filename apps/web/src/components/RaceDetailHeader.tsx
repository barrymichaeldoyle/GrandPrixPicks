import type { Doc } from '@convex-generated/dataModel';

import { useUserDateFormat } from '@/lib/useUserDateFormat';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { RaceFlag } from './RaceFlag';
import { Pill } from './Pill';

interface RaceDetailHeaderProps {
  race: Doc<'races'>;
  isNextRace: boolean;
  resultsSummary?: {
    label: string;
    points: number;
    showResultsPendingBadge: boolean;
    scoredEventCount: number;
    totalEvents: number;
    allEventsScored: boolean;
    /**
     * Whether to show the viewer's own points. False when signed out, where
     * the total is always zero. The scoring progress either side of it is
     * public, so the summary itself still renders.
     */
    showViewerPoints: boolean;
  };
}

export function RaceDetailHeader({
  race,
  isNextRace,
  resultsSummary,
}: RaceDetailHeaderProps) {
  const { settings, formatDateLong, formatTime, formatTimeZoneAbbreviation } =
    useUserDateFormat();
  const countryCode = getCountryCodeForRace(race);

  // The race time is rendered in the viewer's own zone, which made
  // "Sun, Aug 23 · 1:00 PM" unreadable as a fact: no year on a page about a
  // race that has already run, and no way to tell whose clock it is. Both are
  // cheap to state, and the zone abbreviation is what removes the ambiguity.
  const viewerTimeZone =
    settings.timezone ??
    (typeof Intl === 'undefined'
      ? undefined
      : Intl.DateTimeFormat().resolvedOptions().timeZone);
  const timeZoneLabel = viewerTimeZone
    ? formatTimeZoneAbbreviation(race.raceStartAt, viewerTimeZone)
    : undefined;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-start gap-4">
        {countryCode && (
          // Smaller on a phone: at 36px the flag plus its gap took 52px of a
          // 358px content width, which pushed a 40px race name hard against
          // the right edge.
          <div className="mt-1 h-7 shrink-0 sm:mt-2 sm:h-12">
            <RaceFlag countryCode={countryCode} size="full" />
          </div>
        )}
        <div className="min-w-0">
          <span
            className={`gpp-label block ${
              isNextRace ? 'text-accent' : 'text-text-muted'
            }`}
          >
            {/*
              The season sits here rather than in the h1: the page targets
              "<race> <year> results" but the heading carried neither, and a
              hero reading "2026 Dutch Grand Prix" is worse than one reading
              "Dutch Grand Prix" with the year stated right above it.
            */}
            {race.season} · Round {race.round}
            {isNextRace ? ' · Next Race' : ''}
          </span>
          {/*
            The race name is the page hero, and the type scale names it as
            such (`5xl`, weight 300). It previously rendered at `xl`/600 — the
            *title* role — which put it level with the "Session Results"
            heading below it and a step under the circuit guide's own h2.
          */}
          <h1 className="mt-1 text-3xl leading-none font-light tracking-display text-balance text-text sm:text-5xl">
            {race.name}
          </h1>
          <p className="mt-3 text-sm text-text-muted" suppressHydrationWarning>
            {formatDateLong(race.raceStartAt)}
            <span aria-hidden="true"> · </span>
            <span className="gpp-mono">{formatTime(race.raceStartAt)}</span>
            {timeZoneLabel ? (
              <span className="gpp-mono"> {timeZoneLabel}</span>
            ) : null}
          </p>
        </div>
      </div>
      {resultsSummary && (
        <div
          data-testid="race-results-summary"
          className="shrink-0 sm:pt-1 sm:text-right"
        >
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {resultsSummary.showViewerPoints ? (
              <span className="text-sm text-text-muted">
                {resultsSummary.label}
              </span>
            ) : (
              <Pill
                tone={resultsSummary.allEventsScored ? 'success' : 'neutral'}
              >
                {resultsSummary.allEventsScored
                  ? 'All sessions scored'
                  : 'Results in progress'}
              </Pill>
            )}
            {resultsSummary.showResultsPendingBadge ? (
              <Pill tone="accent">Results pending</Pill>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 sm:justify-end">
            {resultsSummary.showViewerPoints ? (
              <div className="gpp-mono text-lg leading-none font-medium text-accent">
                +{resultsSummary.points} pts
              </div>
            ) : null}
            {!resultsSummary.allEventsScored ? (
              <p className="gpp-mono text-xs text-text-muted">
                {resultsSummary.scoredEventCount}/{resultsSummary.totalEvents}{' '}
                events scored
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
