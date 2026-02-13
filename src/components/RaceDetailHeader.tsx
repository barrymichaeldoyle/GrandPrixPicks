import { Calendar, Clock, Lock, Trophy } from 'lucide-react';

import type { Doc } from '../../convex/_generated/dataModel';
import { formatDate, formatTime, formatTimeWithTz } from '../lib/date';
import { Badge } from './Badge';
import { getCountryCodeForRace, RaceFlag, StatusBadge } from './RaceCard';
import { ScoringLegend } from './RaceResults';
import { Tooltip } from './Tooltip';

interface RaceDetailHeaderProps {
  race: Doc<'races'>;
  isNextRace: boolean;
  /** Total points for this race (when finished); shown in sidebar */
  myScore?: { points: number } | null;
  hasMyPicks?: boolean;
}

export function RaceDetailHeader({
  race,
  isNextRace,
  myScore,
  hasMyPicks,
}: RaceDetailHeaderProps) {
  const countryCode = getCountryCodeForRace(race);

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:justify-between">
        {/* Left: Race details */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {countryCode && (
              <span className="inline-flex shrink-0 items-center">
                <RaceFlag countryCode={countryCode} size="lg" />
              </span>
            )}
            <span className="shrink-0 text-sm font-medium text-text-muted">
              Round {race.round}
            </span>
            {isNextRace && <Badge variant="next">NEXT UP</Badge>}
            <StatusBadge status={race.status} isNext={isNextRace} />
          </div>

          <h1 className="mb-1.5 text-lg font-semibold text-text sm:text-xl">
            {race.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar
                size={16}
                className="shrink-0 text-text-muted"
                aria-hidden="true"
              />
              {formatDate(race.raceStartAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock
                size={16}
                className="shrink-0 text-text-muted"
                aria-hidden="true"
              />
              {formatTime(race.raceStartAt)}
            </span>
            {race.status !== 'finished' && (
              <span className="inline-flex items-center gap-1.5">
                <Lock
                  size={16}
                  className="shrink-0 text-text-muted"
                  aria-hidden="true"
                />
                Predictions lock {formatTimeWithTz(race.predictionLockAt)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Results header (desktop only, when race is finished) */}
        {race.status === 'finished' && (
          <div className="hidden shrink-0 flex-col items-end justify-between md:flex">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" />
                <span className="text-lg font-semibold text-text">
                  Weekend Results
                </span>
              </div>
              {myScore && (
                <Tooltip content="Points you scored for this session">
                  <span className="text-lg font-bold text-accent">
                    {myScore.points} {myScore.points === 1 ? 'point' : 'points'}
                  </span>
                </Tooltip>
              )}
            </div>
            {hasMyPicks && (
              <div className="mt-2">
                <ScoringLegend />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
