import type { Doc } from '@convex-generated/dataModel';
import { Calendar, Clock } from 'lucide-react';

import { useUserDateFormat } from '../lib/useUserDateFormat';
import { getCountryCodeForRace } from '../lib/raceCountries';
import { RaceFlag } from './RaceFlag';

function abbreviateGrandPrix(name: string) {
  return name.replace(/\bGrand Prix\b/g, 'GP');
}

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
  };
}

export function RaceDetailHeader({
  race,
  isNextRace,
  resultsSummary,
}: RaceDetailHeaderProps) {
  const { formatDate, formatTime } = useUserDateFormat();
  const countryCode = getCountryCodeForRace(race);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {countryCode && (
          <RaceFlag
            countryCode={countryCode}
            size="lg"
            className="rounded-sm"
          />
        )}
        <div className="min-w-0">
          <span
            className={`text-xs font-semibold tracking-wide uppercase ${
              isNextRace ? 'text-accent' : 'text-text-muted'
            }`}
          >
            Round {race.round}
            {isNextRace ? ' · Next Race' : ''}
          </span>
          <h1 className="truncate text-lg leading-tight font-semibold text-text sm:text-xl">
            <span className="sm:hidden">{abbreviateGrandPrix(race.name)}</span>
            <span className="hidden sm:inline">{race.name}</span>
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
            <span
              className="inline-flex items-center gap-1"
              suppressHydrationWarning
            >
              <Calendar size={14} className="shrink-0" aria-hidden="true" />
              {formatDate(race.raceStartAt)}
            </span>
            <span
              className="inline-flex items-center gap-1"
              suppressHydrationWarning
            >
              <Clock size={14} className="shrink-0" aria-hidden="true" />
              {formatTime(race.raceStartAt)}
            </span>
          </div>
        </div>
      </div>
      {resultsSummary && (
        <div
          data-testid="race-results-summary"
          className="shrink-0 sm:text-right"
        >
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="text-xs text-text-muted">
              {resultsSummary.label}
            </span>
            {resultsSummary.showResultsPendingBadge ? (
              <span className="inline-flex items-center rounded-full border border-accent/35 bg-accent-muted/35 px-2 py-0.5 text-xs font-semibold text-accent">
                Results pending
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 sm:justify-end">
            <div className="leading-none font-bold text-accent">
              +{resultsSummary.points} pts
            </div>
            {!resultsSummary.allEventsScored ? (
              <p className="text-xs text-text-muted">
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
