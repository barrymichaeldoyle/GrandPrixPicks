import { DriverBadge } from '@/components/DriverBadge';
import { RankDelta } from '@/components/RankDelta';
import { PointsBar } from '@/components/standings/PointsBar';
import {
  gapColumnLabel,
  type GapMode,
  StandingsTableFrame,
} from '@/components/standings/StandingsTableFrame';
import { displayTeamName } from '@/lib/display';
import { gapLabel, type DriverRow } from '@/lib/standings';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

function teamColor(team: string | null): string {
  return (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR;
}

/**
 * The drivers' championship table.
 *
 * Every fact a row states lives in its own cell. The old table folded the team
 * and the win count into the driver cell on phones, which read out as one run
 * of text ("ANTKimi AntonelliMercedes · 6 wins") to anything that does not
 * apply the stylesheet: assistive tech, and every crawler that reads the
 * markup rather than the render. Columns that a phone cannot fit are hidden
 * instead, and the table scrolls in a labelled region so they stay reachable.
 */
export function DriverStandingsTable({
  drivers,
  season,
  roundsScored,
  gapMode,
  footnoteIds,
}: {
  drivers: readonly DriverRow[];
  season: number;
  roundsScored: number;
  gapMode: GapMode;
  /** Drivers that carry a mid-season move footnote, by driver id. */
  footnoteIds: ReadonlyMap<string, string>;
}) {
  const leaderPoints = drivers[0]?.points ?? 0;

  return (
    <StandingsTableFrame label={`${season} drivers' championship table`}>
      {/*
        Fixed layout at every width, not just on phones. Sized to its content
        the table re-measures every column when the Gap toggle swaps "+54" for
        "—", and the whole row shifts under the reader's eye for a change that
        should move nothing but one cell.
      */}
      <table className="w-full min-w-[20rem] table-fixed border-collapse text-sm">
        <caption className="sr-only">
          {season} Formula 1 World Drivers' Championship standings after round{' '}
          {roundsScored}, with each driver's position change since the previous
          round, team, race wins, podium finishes, points and gap.
        </caption>
        <thead>
          <tr className="bg-surface-muted/50 text-left text-xs font-semibold tracking-label text-text-muted uppercase">
            <th scope="col" className="w-9 px-2 py-2.5 sm:w-14 sm:px-3">
              Pos
            </th>
            {/* Named in full for a screen reader; the column itself is three
                characters wide and the glyphs in it say the same thing. */}
            <th
              scope="col"
              aria-label="Position change since the previous round"
              className="w-10 px-2 py-2.5 sm:w-16"
            >
              <span aria-hidden>+/−</span>
            </th>
            <th scope="col" className="px-2 py-2.5 sm:px-3">
              Driver
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2.5 sm:table-cell sm:w-36 md:w-40"
            >
              Team
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2.5 text-right md:table-cell md:w-20"
            >
              Wins
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2.5 text-right md:table-cell md:w-24"
            >
              Podiums
            </th>
            <th
              scope="col"
              className="w-14 px-2 py-2.5 text-right sm:w-20 sm:px-3"
            >
              <abbr title="Championship points">Pts</abbr>
            </th>
            <th
              scope="col"
              aria-label={gapColumnLabel(gapMode, 'driver')}
              className="w-12 px-2 py-2.5 text-right sm:w-20 sm:px-3"
            >
              Gap
            </th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => {
            const footnoteId = footnoteIds.get(driver.driverId as string);
            const gap =
              gapMode === 'leader' ? driver.gapToLeader : driver.gapToAhead;
            return (
              <tr key={driver.driverId} className="border-t border-border/70">
                <td className="gpp-mono px-2 py-2.5 font-semibold text-text-muted sm:px-3">
                  {driver.position}
                </td>
                <td className="px-2 py-2.5">
                  <RankDelta delta={driver.positionChange} />
                </td>
                <th
                  scope="row"
                  className="px-2 py-2.5 text-left font-normal sm:px-3"
                >
                  <span className="flex items-center gap-2">
                    {/* The badge carries the team colour, which is the row's
                        only use of colour and never its only signal: the team
                        has a column of its own. */}
                    <DriverBadge
                      code={driver.code}
                      team={driver.team}
                      displayName={driver.displayName}
                      number={driver.number}
                      nationality={driver.nationality}
                      size="sm"
                      prerenderTooltip={false}
                    />
                    <span className="min-w-0 font-medium text-text">
                      {driver.displayName}
                      {footnoteId ? (
                        <a
                          href={`#${footnoteId}`}
                          className="ml-0.5 align-super text-xs text-accent underline-offset-2 hover:underline"
                        >
                          <span aria-hidden>†</span>
                          <span className="sr-only">
                            Changed team mid-season: see the note below the
                            table
                          </span>
                        </a>
                      ) : null}
                    </span>
                  </span>
                </th>
                <td className="hidden px-3 py-2.5 text-text-muted sm:table-cell">
                  {driver.team ? displayTeamName(driver.team) : '—'}
                </td>
                <td className="gpp-mono hidden px-3 py-2.5 text-right text-text-muted md:table-cell">
                  {driver.wins}
                </td>
                <td className="gpp-mono hidden px-3 py-2.5 text-right text-text-muted md:table-cell">
                  {driver.podiums}
                </td>
                <td className="gpp-mono px-2 py-2.5 text-right font-semibold text-text sm:px-3">
                  {driver.points}
                  <PointsBar
                    points={driver.points}
                    leaderPoints={leaderPoints}
                    color={teamColor(driver.team)}
                  />
                </td>
                <td className="gpp-mono px-2 py-2.5 text-right text-text-muted sm:px-3">
                  {gapLabel(gap)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </StandingsTableFrame>
  );
}
