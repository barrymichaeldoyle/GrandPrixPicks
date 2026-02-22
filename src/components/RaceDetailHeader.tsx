import { Calendar, Clock } from 'lucide-react';

import type { Doc } from '../../convex/_generated/dataModel';
import { formatDate, formatTime } from '../lib/date';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';
import { getCountryCodeForRace, RaceFlag, StatusBadge } from './RaceCard';

interface RaceDetailHeaderProps {
  race: Doc<'races'>;
  isNextRace: boolean;
}

export function RaceDetailHeader({ race, isNextRace }: RaceDetailHeaderProps) {
  const countryCode = getCountryCodeForRace(race);
  const showCountdown = race.status === 'upcoming' && isNextRace;

  return (
    <div className="p-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-0 md:items-stretch md:gap-3">
          {countryCode && (
            <div className="flex shrink-0 items-start pl-0 md:hidden">
              <RaceFlag
                countryCode={countryCode}
                size="sm"
                className="!rounded-none ring-0"
              />
            </div>
          )}
          {countryCode && (
            <div className="hidden shrink-0 self-stretch border-r border-accent/50 md:flex md:items-stretch">
              <span className="hidden h-full md:flex">
                <RaceFlag
                  countryCode={countryCode}
                  size="full"
                  className="!rounded-none ring-0"
                />
              </span>
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-3 sm:px-4 sm:py-4 md:p-0">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="text-xs font-medium text-text-muted">
                Round {race.round}
              </span>
              <span className="ml-auto max-w-[70%] min-w-0 md:max-w-none">
                {showCountdown ? (
                  <PredictionCountdownBadge
                    predictionLockAt={race.predictionLockAt}
                    sessionLabel="Race"
                    className="mr-1 -mb-1 justify-end text-right text-xs md:text-sm"
                  />
                ) : (
                  <StatusBadge status={race.status} isNext={isNextRace} />
                )}
              </span>
            </div>
            <h1 className="truncate text-base font-semibold text-text sm:text-lg">
              {race.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
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
      </div>
    </div>
  );
}
