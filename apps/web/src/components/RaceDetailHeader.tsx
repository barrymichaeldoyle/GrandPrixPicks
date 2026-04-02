import type { Doc } from '@convex-generated/dataModel';
import { Calendar, Clock } from 'lucide-react';

import { formatDate, formatTime } from '../lib/date';
import { getCountryCodeForRace, RaceFlag } from './RaceCard';

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
  const countryCode = getCountryCodeForRace(race);
  const accentBorderClass = isNextRace ? 'border-accent/50' : 'border-border';

  return (
    <div className="flex flex-col md:flex-row md:items-stretch md:justify-between md:gap-2">
      <div className="flex min-w-0 flex-1 items-stretch gap-0">
        {countryCode && (
          <div
            className={`shrink-0 self-stretch border-r-3 ${accentBorderClass} md:hidden`}
          >
            <img
              src={`https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`}
              srcSet={`https://flagcdn.com/w320/${countryCode.toLowerCase()}.png 2x`}
              alt=""
              className="h-[80px] w-auto"
              loading="eager"
              decoding="sync"
            />
          </div>
        )}
        {countryCode && (
          <div
            className={`hidden shrink-0 self-stretch border-r-3 ${accentBorderClass} md:flex md:items-stretch`}
          >
            <span className="hidden h-full md:flex">
              <RaceFlag
                countryCode={countryCode}
                size="full"
                className="!rounded-none ring-0"
              />
            </span>
          </div>
        )}
        <div className="relative flex min-w-0 flex-1 flex-col justify-between px-3 py-3 sm:px-4 sm:py-4">
          <span className="text-xs font-medium text-text-muted">
            Round {race.round}
          </span>
          <h1 className="relative bottom-0.5 truncate text-base leading-tight font-semibold text-text sm:text-lg">
            {race.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
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
          className={`gap-2 border-t-3 px-3 py-2 sm:px-4 md:flex md:flex-col md:justify-center md:border-t-0 md:border-l-3 ${accentBorderClass}`}
        >
          {resultsSummary.showResultsPendingBadge ||
          !resultsSummary.allEventsScored ? (
            <>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-text-muted">
                  {resultsSummary.label}
                </span>
                {resultsSummary.showResultsPendingBadge ? (
                  <span className="inline-flex items-center rounded-full border border-accent/35 bg-accent-muted/35 px-2 py-0.5 text-xs font-semibold text-accent">
                    Results pending
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-0.5">
                <div className="leading-none font-bold text-accent">
                  +{resultsSummary.points} pts
                </div>
                {!resultsSummary.allEventsScored ? (
                  <p className="text-xs text-text-muted">
                    {resultsSummary.scoredEventCount}/
                    {resultsSummary.totalEvents} events scored
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="text-xs text-text-muted">
                {resultsSummary.label}
              </span>
              <div className="leading-none font-bold text-accent">
                +{resultsSummary.points} pts
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
