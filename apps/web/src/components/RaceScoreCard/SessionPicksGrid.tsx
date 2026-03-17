import {
  DriverBadge,
  DriverBadgeSkeleton,
  ScoredDriverBadge,
} from '../DriverBadge';
import type { DriverRef, PickBreakdown } from './types';

interface SessionPicksGridProps {
  picks: DriverRef[];
  breakdown: PickBreakdown[] | null;
  /** Compact mode uses smaller layout */
  compact?: boolean;
}

export function SessionPicksGrid({
  picks,
  breakdown,
  compact,
}: SessionPicksGridProps) {
  if (picks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {picks.map((pick, position) => {
        const breakdownItem = breakdown?.find(
          (b) => b.predictedPosition === position + 1,
        );

        return (
          <div key={position} className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-semibold text-text-muted/60">
              P{position + 1}
            </span>
            {pick.code !== '???' ? (
              <div className="flex items-center gap-1.5">
                {breakdownItem !== undefined ? (
                  <>
                    <ScoredDriverBadge
                      code={pick.code}
                      team={pick.team}
                      displayName={pick.displayName}
                      number={pick.number}
                      nationality={pick.nationality}
                      size={compact ? 'md' : 'md'}
                      pickPoints={breakdownItem.points}
                    />
                    <span
                      className={`shrink-0 text-[10px] font-bold ${
                        breakdownItem.points ? 'text-success' : 'text-error/60'
                      }`}
                    >
                      {breakdownItem.points ? `+${breakdownItem.points}` : '-'}
                    </span>
                  </>
                ) : (
                  <DriverBadge
                    code={pick.code}
                    team={pick.team}
                    displayName={pick.displayName}
                    number={pick.number}
                    nationality={pick.nationality}
                  />
                )}
              </div>
            ) : (
              <DriverBadgeSkeleton />
            )}
          </div>
        );
      })}
    </div>
  );
}
