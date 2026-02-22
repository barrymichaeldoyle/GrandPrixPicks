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

  return (
    <div className="overflow-hidden rounded-lg rounded-t-none border border-border bg-surface">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-sm">
            <th className="px-2 py-2 text-left text-text-muted sm:px-4">
              <Tooltip content="Position">Pos</Tooltip>
            </th>
            <th className="px-2 py-2 text-left text-text-muted sm:px-4">
              Result
            </th>
            {hasMyPicks && (
              <th className="px-2 py-2 text-left text-text-muted sm:px-4">
                <Tooltip content="Your predicted finisher and points for this pick">
                  Pick
                </Tooltip>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {classification.map((entry) => {
            const myPick = myPickByPosition.get(entry.position);
            const showPickColumn = entry.position <= 5;

            return (
              <tr
                key={entry.driverId}
                className={`border-b border-border last:border-0 ${
                  entry.position <= 5 ? 'bg-accent-muted/50' : ''
                }`}
              >
                <td className="px-2 py-1.5 text-text-muted sm:px-4 sm:py-2">
                  P{entry.position}
                </td>
                <td className="px-2 py-1.5 sm:px-4 sm:py-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <DriverBadge
                      code={entry.code}
                      team={entry.team}
                      displayName={entry.displayName}
                      number={entry.number}
                      nationality={entry.nationality}
                    />
                    <div className="hidden sm:block">
                      <div className="font-medium text-text">
                        {entry.displayName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        {entry.nationality && (
                          <Flag code={entry.nationality} size="xs" />
                        )}
                        {entry.number != null && (
                          <span className="font-mono font-medium">
                            #{entry.number}
                          </span>
                        )}
                        {entry.team && (
                          <span className="text-text-muted">
                            {displayTeamName(entry.team)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
                            myPick.points ? 'text-success' : 'text-error'
                          }`}
                        >
                          +{myPick.points}
                        </span>
                      </div>
                    ) : showPickColumn ? (
                      <span className="text-text-muted/50">&mdash;</span>
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
