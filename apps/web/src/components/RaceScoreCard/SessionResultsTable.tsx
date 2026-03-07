import { displayTeamName } from '@/lib/display';

import { DriverBadge } from '../DriverBadge';
import { Flag } from '../Flag';
import { Tooltip } from '../Tooltip';
import type { ClassificationEntry, PickBreakdown } from './types';

interface SessionResultsTableProps {
  classification: Array<ClassificationEntry>;
  breakdown: Array<PickBreakdown> | null;
}

export function SessionResultsTable({
  classification,
  breakdown,
}: SessionResultsTableProps) {
  // Create lookup: position → user's pick for that position
  const myPickByPosition = new Map<number, { code: string; points: number }>();
  if (breakdown) {
    // Map driverId → code from the full classification
    const driverCodeMap = new Map(
      classification.map((e) => [e.driverId, e.code]),
    );
    for (const item of breakdown) {
      const code = driverCodeMap.get(item.driverId) ?? '???';
      myPickByPosition.set(item.predictedPosition, {
        code,
        points: item.points,
      });
    }
  }

  const hasMyPicks = myPickByPosition.size > 0;
  const scoringRows = classification.slice(0, 6);
  const remainingRows = classification.slice(6);
  const midpoint = Math.ceil(remainingRows.length / 2);
  const remainingColumns = [
    remainingRows.slice(0, midpoint),
    remainingRows.slice(midpoint),
  ];

  // Build code→details map from classification for pick badges
  const codeToDetails = new Map(
    classification.map((e) => [
      e.code,
      {
        team: e.team,
        displayName: e.displayName,
        number: e.number,
        nationality: e.nationality,
      },
    ]),
  );

  function renderDriver(entry: ClassificationEntry, compact = false) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <DriverBadge
          code={entry.code}
          team={entry.team}
          displayName={entry.displayName}
          number={entry.number}
          nationality={entry.nationality}
          size={compact ? 'sm' : 'md'}
        />
        <div className={compact ? 'min-w-0' : 'hidden sm:block'}>
          <div className="truncate font-medium text-text">
            {entry.displayName}
          </div>
          {!compact && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              {entry.nationality && <Flag code={entry.nationality} size="xs" />}
              {entry.number != null && (
                <span className="font-mono font-medium">#{entry.number}</span>
              )}
              {entry.team && (
                <span className="text-text-muted">
                  {displayTeamName(entry.team)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg rounded-t-none border border-border bg-surface">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-sm">
            <th className="px-2 py-2 text-left text-text-muted sm:px-4">
              <Tooltip content="Position">Pos</Tooltip>
            </th>
            <th className="px-2 py-2 text-left text-text-muted sm:px-4">
              Actual
            </th>
            {hasMyPicks && (
              <th className="px-2 py-2 text-left text-text-muted sm:px-4">
                <Tooltip content="Your predicted finisher and points for this pick">
                  Top 5
                </Tooltip>
              </th>
            )}
            <th className="px-2 py-2 text-right text-text-muted sm:px-4">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {scoringRows.map((entry) => {
            const myPick = myPickByPosition.get(entry.position);
            const showPickColumn = entry.position <= 5;

            return (
              <tr
                key={entry.driverId}
                className="border-b border-border bg-accent-muted/40 last:border-0"
              >
                <td className="px-2 py-1.5 text-text-muted sm:px-4 sm:py-2">
                  P{entry.position}
                </td>
                <td className="px-2 py-1.5 sm:px-4 sm:py-2">
                  {renderDriver(entry)}
                </td>
                {hasMyPicks && (
                  <td className="px-2 py-1.5 sm:px-4 sm:py-2">
                    {showPickColumn && myPick ? (
                      <div className="flex items-center gap-2">
                        <DriverBadge
                          code={myPick.code}
                          team={codeToDetails.get(myPick.code)?.team}
                          displayName={
                            codeToDetails.get(myPick.code)?.displayName
                          }
                          number={codeToDetails.get(myPick.code)?.number}
                          nationality={
                            codeToDetails.get(myPick.code)?.nationality
                          }
                        />
                        <span
                          className={`shrink-0 font-bold ${
                            myPick.points ? 'text-success' : 'text-text-muted'
                          }`}
                        >
                          +{myPick.points}
                        </span>
                      </div>
                    ) : showPickColumn ? (
                      <span className="text-text-muted/50">&mdash;</span>
                    ) : (
                      <span className="text-text-muted/50">&mdash;</span>
                    )}
                  </td>
                )}
                <td className="px-2 py-1.5 text-right font-semibold text-text-muted sm:px-4 sm:py-2">
                  +{myPick?.points ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {remainingRows.length > 0 && (
        <div className="border-t border-border bg-surface-muted/20 p-3 sm:p-4">
          <div className="grid gap-3 md:grid-cols-2">
            {remainingColumns.map((column, index) => (
              <table
                key={index}
                className="w-full overflow-hidden rounded-lg border border-border/80 bg-surface"
              >
                <thead>
                  <tr className="border-b border-border text-xs tracking-[0.14em] text-text-muted uppercase">
                    <th className="px-3 py-2 text-left">Pos</th>
                    <th className="px-3 py-2 text-left">Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {column.map((entry) => (
                    <tr
                      key={entry.driverId}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 text-sm text-text-muted">
                        P{entry.position}
                      </td>
                      <td className="px-3 py-2">{renderDriver(entry, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
