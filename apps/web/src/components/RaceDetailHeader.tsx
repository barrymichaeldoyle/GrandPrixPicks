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

  return (
    <div className="p-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:justify-between">
        <div className="flex min-w-0 flex-1 items-stretch gap-0 md:gap-3">
          {countryCode && (
            <div
              className={`flex shrink-0 self-stretch border-r-3 ${isNextRace ? 'border-accent/50' : 'border-border'} md:hidden`}
            >
              <span className="flex h-full">
                <RaceFlag
                  countryCode={countryCode}
                  size="full"
                  className="!rounded-none ring-0"
                />
              </span>
            </div>
          )}
          {countryCode && (
            <div
              className={`hidden shrink-0 self-stretch border-r-3 ${isNextRace ? 'border-accent/50' : 'border-border'} md:flex md:items-stretch`}
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
          <div className="relative flex min-w-0 flex-1 flex-col justify-center px-3 py-3 sm:px-4 sm:py-4 md:p-0">
            <span className="text-xs font-medium text-text-muted">
              Round {race.round}
            </span>
            <h1 className="truncate pt-0.5 text-base leading-tight font-semibold text-text sm:text-lg">
              {race.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1">
                <Calendar size={14} className="shrink-0" aria-hidden="true" />
                {formatDate(race.raceStartAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={14} className="shrink-0" aria-hidden="true" />
                {formatTime(race.raceStartAt)}
              </span>
            </div>
          </div>
        </div>
        {resultsSummary && (
          <div
            className={`gap-2 border-t-3 px-3 py-2 sm:px-4 md:flex md:flex-col md:justify-center md:border-t-0 md:border-l-3 ${
              isNextRace ? 'border-accent/50' : 'border-border'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 md:justify-center">
              <span className="text-xs text-text-muted">
                {resultsSummary.label}
              </span>
              {resultsSummary.showResultsPendingBadge ? (
                <span className="inline-flex items-center rounded-full border border-accent/35 bg-accent-muted/35 px-2 py-0.5 text-xs font-semibold text-accent">
                  Results pending
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-baseline gap-4 md:justify-center">
              <div className="leading-none font-bold text-accent">
                +{resultsSummary.points} pts
              </div>
              {!resultsSummary.allEventsScored && (
                <p className="text-xs text-text-muted">
                  {resultsSummary.scoredEventCount}/{resultsSummary.totalEvents}{' '}
                  events scored
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
