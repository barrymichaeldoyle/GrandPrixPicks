import type { Id } from '@convex-generated/dataModel';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { displayTeamName } from '@/lib/display';

import { TEAM_COLORS } from './DriverBadge';
import { Flag } from './Flag';

type Driver = {
  _id: Id<'drivers'>;
  code: string;
  displayName: string;
  number?: number | null;
  nationality?: string | null;
};

type Matchup = {
  _id: Id<'h2hMatchups'>;
  team: string;
  driver1: Driver;
  driver2: Driver;
};

interface H2HMatchupGridProps {
  matchups: Array<Matchup>;
  selections: Record<string, Id<'drivers'> | undefined>;
  mode?: 'interactive' | 'readonly';
  onSelect?: (matchupId: Id<'h2hMatchups'>, driverId: Id<'drivers'>) => void;
  className?: string;
  actionCard?: ReactNode;
}

export function H2HMatchupGrid({
  matchups,
  selections,
  mode = 'interactive',
  onSelect,
  className = '',
  actionCard,
}: H2HMatchupGridProps) {
  const gridClassName = [
    'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const isInteractive = mode === 'interactive';

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
                const sharedClassName = `relative flex flex-1 flex-col items-stretch rounded-md border border-transparent px-3 py-2 ${
                  isSelected
                    ? 'bg-accent-muted ring-2 ring-accent ring-inset'
                    : isInteractive
                      ? 'transition-all hover:bg-surface-muted'
                      : ''
                }`;

                const content = (
                  <>
                    <div className="flex min-w-0 flex-1 items-start justify-start gap-x-1.5">
                      <div className="flex shrink-0 flex-col items-center">
                        <span
                          className="rounded px-1 py-0.5 font-mono text-xs font-bold text-white"
                          style={{ backgroundColor: teamColor }}
                        >
                          {driver.code}
                        </span>
                        {driver.number != null && (
                          <span className="mt-0.5 text-[10px] text-text-muted">
                            #{driver.number}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 items-center gap-1 pt-0.5">
                        {driver.nationality && (
                          <Flag code={driver.nationality} size="xs" />
                        )}
                        <span className="truncate text-xs text-text">
                          {driver.displayName.split(' ').pop()}
                        </span>
                      </div>
                    </div>
                    <span className="absolute right-3 bottom-1.5 flex shrink-0 items-center justify-end gap-1 text-right text-xs font-semibold">
                      {isSelected ? (
                        <>
                          <Check
                            size={12}
                            className="shrink-0 text-accent"
                            strokeWidth={3}
                          />
                          <span className="text-accent">Picked</span>
                        </>
                      ) : isInteractive ? (
                        <span className="text-accent">Pick</span>
                      ) : (
                        <span className="text-text-muted">Not picked</span>
                      )}
                    </span>
                  </>
                );

                if (!isInteractive) {
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
