import { Calendar, Clock, Trophy } from 'lucide-react';

import type { Doc } from '../../convex/_generated/dataModel';
import { formatDate, formatTime } from '../lib/date';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';
import { getCountryCodeForRace, RaceFlag, StatusBadge } from './RaceCard';
import { ScoringLegend } from './RaceResults';
import { Tooltip } from './Tooltip';

interface RaceDetailHeaderProps {
  race: Doc<'races'>;
  isNextRace: boolean;
  /** Weekend score summary (shown when any session is scored) */
  myScore?: {
    totalPoints: number;
    scoredSessions: number;
    totalSessions: number;
  } | null;
  hasMyPicks?: boolean;
}

export function RaceDetailHeader({
  race,
  isNextRace,
  myScore,
  hasMyPicks,
}: RaceDetailHeaderProps) {
  const countryCode = getCountryCodeForRace(race);
  const showCountdown = race.status === 'upcoming' && isNextRace;

  return (
    <div className="relative">
      {/* Badge: top-right corner of card */}
      <div className="absolute top-11 right-1">
        {showCountdown ? (
          <PredictionCountdownBadge
            predictionLockAt={race.predictionLockAt}
            sessionLabel="Race"
          />
        ) : (
          <StatusBadge status={race.status} isNext={isNextRace} />
        )}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 items-stretch gap-3">
          {countryCode && (
            <div className="flex shrink-0 items-center border-r border-accent/50">
              <RaceFlag countryCode={countryCode} size="full" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-medium text-text-muted">
                Round {race.round}
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

        {/* Right: Results header (desktop only, when any session is scored) */}
        {myScore != null && (
          <div className="hidden shrink-0 items-center gap-2 pt-1 pr-1 md:flex">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="text-sm font-semibold text-text">
                {myScore.scoredSessions < myScore.totalSessions
                  ? `${myScore.scoredSessions} of ${myScore.totalSessions} sessions`
                  : 'Weekend Results'}
              </span>
            </div>
            <Tooltip content="Points you scored across scored sessions">
              <span className="text-sm font-bold text-accent">
                {myScore.totalPoints}{' '}
                {myScore.totalPoints === 1 ? 'point' : 'points'}
              </span>
            </Tooltip>
            {hasMyPicks && <ScoringLegend />}
          </div>
        )}
      </div>
    </div>
  );
}
