import type { Id } from '@convex-generated/dataModel';
import { Check, CircleX, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { displayTeamName } from '@/lib/display';

import { DriverBadge, TEAM_COLORS } from './DriverBadge';
import { Flag } from './Flag';
import { Tooltip } from './Tooltip';

type Driver = {
  _id: Id<'drivers'>;
  code: string;
  displayName: string;
  number?: number | null;
  team?: string | null;
  nationality?: string | null;
};

type Matchup = {
  _id: Id<'h2hMatchups'>;
  team: string;
  driver1: Driver;
  driver2: Driver;
};

interface H2HMatchupGridProps {
  matchups: Matchup[];
  selections: Record<string, Id<'drivers'> | undefined>;
  mode?: 'interactive' | 'readonly' | 'results';
  onSelect?: (matchupId: Id<'h2hMatchups'>, driverId: Id<'drivers'>) => void;
  className?: string;
  actionCard?: ReactNode;
  winners?: Record<string, Id<'drivers'> | undefined>;
  pointsByMatchup?: Record<string, number | undefined>;
  readonlyClickTooltip?: string;
}

export function H2HMatchupGrid({
  matchups,
  selections,
  mode = 'interactive',
  onSelect,
  className = '',
  actionCard,
  winners = {},
  pointsByMatchup = {},
  readonlyClickTooltip,
}: H2HMatchupGridProps) {
  const gridClassName = [
    'grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const isInteractive = mode === 'interactive';
  const isResults = mode === 'results';

  return (
    <div className={gridClassName}>
      {matchups.map((matchup) => {
        const selected = selections[matchup._id];
        const teamColor = TEAM_COLORS[matchup.team] ?? '#666';

        return (
          <div
            key={matchup._id}
            className="overflow-hidden rounded-lg border border-border bg-surface"
          >
            <div
              className="px-3 py-1.5 text-xs font-bold tracking-wider text-white uppercase"
              style={{ backgroundColor: teamColor }}
            >
              {displayTeamName(matchup.team)}
            </div>

            <div className="flex gap-1 p-1">
              {[matchup.driver1, matchup.driver2].map((driver) => {
                const isSelected = selected === driver._id;
                const isWinner = winners[matchup._id] === driver._id;
                const matchupPoints = pointsByMatchup[matchup._id] ?? 0;
                const wasCorrect = isSelected && matchupPoints > 0;
                const sharedClassName = `relative flex min-h-[48px] flex-1 flex-col items-stretch rounded-md border border-transparent px-3 pt-1 pb-2 ${
                  isSelected
                    ? 'bg-accent-muted ring-2 ring-accent ring-inset'
                    : isInteractive
                      ? 'transition-all hover:bg-surface-muted'
                      : ''
                }`;

                const content = (
                  <>
                    <div className="relative top-0.25 flex min-w-0 flex-1 items-start gap-2">
                      <div
                        className="flex shrink-0 flex-col items-center"
                        data-driver-badge-trigger
                      >
                        <DriverBadge
                          code={driver.code}
                          team={driver.team}
                          displayName={driver.displayName}
                          number={driver.number}
                          nationality={driver.nationality}
                          size="sm"
                        />
                        {driver.number != null && (
                          <span className="mt-1 text-[10px] leading-none text-text-muted">
                            #{driver.number}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="flex min-w-0 items-center gap-1">
                          {driver.nationality && (
                            <Flag code={driver.nationality} size="xs" />
                          )}
                          <span className="block truncate text-xs text-text">
                            {driver.displayName.split(' ').pop()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="absolute right-3 bottom-1.5 flex shrink-0 items-center justify-end gap-1 text-right text-xs font-semibold">
                      {isResults ? (
                        isSelected ? (
                          wasCorrect ? (
                            <>
                              <Trophy
                                size={12}
                                className="shrink-0 text-success"
                                strokeWidth={2.5}
                              />
                              <span className="text-success">
                                Winner · +{matchupPoints}
                              </span>
                            </>
                          ) : (
                            <>
                              <CircleX
                                size={12}
                                className="shrink-0 text-error"
                                strokeWidth={2.5}
                              />
                              <span className="text-error">Your pick</span>
                            </>
                          )
                        ) : isWinner ? (
                          <>
                            <Trophy
                              size={12}
                              className="shrink-0 text-success"
                              strokeWidth={2.5}
                            />
                            <span className="text-success">Winner</span>
                          </>
                        ) : (
                          <span aria-hidden="true" />
                        )
                      ) : isSelected ? (
                        <>
                          <Check
                            size={12}
                            className="shrink-0 text-accent"
                            strokeWidth={3}
                          />
                          <span className="text-accent">Picked</span>
                        </>
                      ) : isInteractive ? (
                        <span className="w-none text-accent">Pick</span>
                      ) : (
                        <span className="invisible" aria-hidden="true">
                          Pick
                        </span>
                      )}
                    </span>
                  </>
                );

                if (!isInteractive) {
                  if (readonlyClickTooltip && mode === 'readonly') {
                    return (
                      <Tooltip
                        key={driver._id}
                        content={readonlyClickTooltip}
                        openOnClick
                        triggerClassName="flex-1"
                        ignoreClickWithinSelector="[data-driver-badge-trigger]"
                      >
                        <button
                          type="button"
                          aria-label={`${displayTeamName(matchup.team)}: ${driver.displayName}. Click edit above to change`}
                          className={`${sharedClassName} cursor-pointer`}
                        >
                          {content}
                        </button>
                      </Tooltip>
                    );
                  }

                  return (
                    <div key={driver._id} className={sharedClassName}>
                      {content}
                    </div>
                  );
                }

                return (
                  <button
                    key={driver._id}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${displayTeamName(matchup.team)}: Pick ${driver.displayName}`}
                    onClick={() => onSelect?.(matchup._id, driver._id)}
                    className={sharedClassName}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {actionCard}
    </div>
  );
}
