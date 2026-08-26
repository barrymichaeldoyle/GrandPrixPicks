import type { Id } from '@convex-generated/dataModel';
import { Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';

import { displayTeamName } from '@/lib/display';

import { DriverBadge, FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';
import type { H2HDriver, H2HMatchup } from './H2HMatchupGrid';

interface H2HResultsTableProps {
  matchups: H2HMatchup[];
  /** The viewer's pick per matchup. Empty when signed out. */
  selections: Record<string, Id<'drivers'> | undefined>;
  winners: Record<string, Id<'drivers'> | undefined>;
  pointsByMatchup?: Record<string, number | undefined>;
  /** Adds the viewer's pick column. */
  showViewerColumn: boolean;
  caption: string;
}

/**
 * The settled duels for one session, as a timing sheet.
 *
 * The picker (`H2HMatchupGrid`) is a grid of cards because picking is eleven
 * separate decisions and each one wants its own target. Reading a finished
 * result is the opposite job: one scan down a column. As cards it left a hole
 * in the bottom-right of a 3-across grid, ran to ~2,100px on a phone, and
 * marked the winner with a badge absolutely positioned in the corner of a
 * half-cell — which put the word "Winner" visually between the two drivers it
 * had to distinguish.
 *
 * Here the winner is named by *column*, which is how a classification has
 * always answered that question, so the badge disappears along with the
 * ambiguity. Green is not spent on the winner: beating a team-mate is a fact,
 * not the reader's score. Colour appears only in the viewer's own column,
 * where the scoring bands mean what `lib/scoring.ts` says they mean.
 */
export function H2HResultsTable({
  matchups,
  selections,
  winners,
  pointsByMatchup = {},
  showViewerColumn,
  caption,
}: H2HResultsTableProps) {
  function driverCell(driver: H2HDriver, isPicked: boolean, muted: boolean) {
    return (
      <div
        className={`flex min-w-0 items-center gap-2 rounded-sm border px-1.5 py-1 ${
          isPicked
            ? // The system's one selection treatment: a surface step plus a
              // hairline. Costs no accent, and says which driver you backed
              // without repeating it in the points column.
              'border-border-strong bg-surface-elevated'
            : 'border-transparent'
        }`}
      >
        <DriverBadge
          code={driver.code}
          team={driver.team}
          displayName={driver.displayName}
          number={driver.number}
          nationality={driver.nationality}
          size="sm"
        />
        {/*
          Surname on a phone, where a full name truncates mid-word inside a
          ~140px column, and the full name from `sm` up, where the column has
          room to spare and whitespace is the worse use of it. Both forms are
          visible text; the screen-reader name is always the full one.
        */}
        <span
          aria-hidden="true"
          className={`min-w-0 truncate text-sm ${
            muted ? 'text-text-muted' : 'text-text'
          }`}
        >
          <span className="sm:hidden">
            {driver.displayName.split(' ').pop()}
          </span>
          <span className="hidden sm:inline">{driver.displayName}</span>
        </span>
        <span className="sr-only">{driver.displayName}</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full table-fixed">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="gpp-label w-[28%] px-3 py-2 text-left sm:w-[22%]"
            >
              Team
            </th>
            <th scope="col" className="gpp-label px-2 py-2 text-left sm:px-3">
              Won
            </th>
            <th scope="col" className="gpp-label px-2 py-2 text-left sm:px-3">
              Beaten
            </th>
            {showViewerColumn && (
              <th
                scope="col"
                className="gpp-label w-16 px-3 py-2 text-right sm:w-24"
              >
                Your pick
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {matchups.map((matchup) => {
            const winnerId = winners[matchup._id];
            const picked = selections[matchup._id];
            const points = pointsByMatchup[matchup._id] ?? 0;
            const teamColor = TEAM_COLORS[matchup.team] ?? FALLBACK_TEAM_COLOR;
            const teamName = displayTeamName(matchup.team);

            // Order by result rather than by seat, so "who won" is answered
            // by which column the driver is in.
            const [won, beaten] =
              winnerId === matchup.driver2._id
                ? [matchup.driver2, matchup.driver1]
                : [matchup.driver1, matchup.driver2];

            const wasCorrect = picked != null && picked === winnerId;

            return (
              <tr
                key={matchup._id}
                className="border-b border-border last:border-0"
              >
                {/*
                  `aria-label` repeats the visible team name. The cell stays a
                  real table-cell (a flex `th` leaves the table formatting
                  context and `table-fixed` stops governing its column), and
                  the label is what the a11y lint rule can resolve statically
                  from a cell whose only text is an expression.
                */}
                <th
                  scope="row"
                  aria-label={teamName}
                  className="px-3 py-1.5 text-left font-normal"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="gpp-team-dot shrink-0"
                      style={{ '--team-colour': teamColor } as CSSProperties}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate text-xs text-text-muted">
                      {teamName}
                    </span>
                  </span>
                </th>
                <td className="px-1 py-1.5 sm:px-2">
                  {driverCell(won, picked === won._id, false)}
                </td>
                <td className="px-1 py-1.5 sm:px-2">
                  {driverCell(beaten, picked === beaten._id, true)}
                </td>
                {showViewerColumn && (
                  <td className="px-3 py-1.5 text-right">
                    {picked == null ? (
                      <span className="text-text-muted" aria-label="No pick">
                        &mdash;
                      </span>
                    ) : wasCorrect ? (
                      <span className="inline-flex items-center justify-end gap-1.5 text-result-near">
                        <Check size={14} strokeWidth={3} aria-hidden="true" />
                        <span className="gpp-mono text-sm">+{points}</span>
                        <span className="sr-only">Correct</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-end gap-1.5 text-result-miss">
                        <X size={14} strokeWidth={3} aria-hidden="true" />
                        <span className="gpp-mono text-sm">+0</span>
                        <span className="sr-only">Wrong</span>
                      </span>
                    )}
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
