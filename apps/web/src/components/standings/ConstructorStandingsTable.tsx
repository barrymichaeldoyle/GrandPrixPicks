import { RankDelta } from '@/components/RankDelta';
import { PointsBar } from '@/components/standings/PointsBar';
import {
  gapColumnLabel,
  type GapMode,
  StandingsTableFrame,
} from '@/components/standings/StandingsTableFrame';
import { displayTeamName } from '@/lib/display';
import { gapLabel, type ConstructorRow } from '@/lib/standings';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

function teamColor(team: string): string {
  return TEAM_COLORS[team] || FALLBACK_TEAM_COLOR;
}

/** The constructors' championship table, columns matched to the drivers'. */
export function ConstructorStandingsTable({
  constructors,
  season,
  roundsScored,
  gapMode,
}: {
  constructors: readonly ConstructorRow[];
  season: number;
  roundsScored: number;
  gapMode: GapMode;
}) {
  const leaderPoints = constructors[0]?.points ?? 0;

  return (
    <StandingsTableFrame label={`${season} constructors' championship table`}>
      {/* Fixed layout for the same reason as the drivers' table above: the
          Gap toggle must move one cell, not every column. */}
      <table className="w-full min-w-[20rem] table-fixed border-collapse text-sm">
        <caption className="sr-only">
          {season} Formula 1 World Constructors' Championship standings after
          round {roundsScored}, with each team's position change since the
          previous round, race wins, podium finishes, points and gap.
        </caption>
        <thead>
          <tr className="bg-surface-muted/50 text-left text-xs font-semibold tracking-label text-text-muted uppercase">
            <th scope="col" className="w-9 px-2 py-2.5 sm:w-14 sm:px-3">
              Pos
            </th>
            <th
              scope="col"
              aria-label="Position change since the previous round"
              className="w-10 px-2 py-2.5 sm:w-16"
            >
              <span aria-hidden>+/−</span>
            </th>
            <th scope="col" className="px-2 py-2.5 sm:px-3">
              Team
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2.5 text-right sm:table-cell sm:w-20"
            >
              Wins
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2.5 text-right sm:table-cell sm:w-24"
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
              aria-label={gapColumnLabel(gapMode, 'team')}
              className="w-12 px-2 py-2.5 text-right sm:w-20 sm:px-3"
            >
              Gap
            </th>
          </tr>
        </thead>
        <tbody>
          {constructors.map((team) => {
            const gap =
              gapMode === 'leader' ? team.gapToLeader : team.gapToAhead;
            return (
              <tr key={team.team} className="border-t border-border/70">
                <td className="gpp-mono px-2 py-2.5 font-semibold text-text-muted sm:px-3">
                  {team.position}
                </td>
                <td className="px-2 py-2.5">
                  <RankDelta delta={team.positionChange} />
                </td>
                <th
                  scope="row"
                  className="px-2 py-2.5 text-left font-normal sm:px-3"
                >
                  <span className="flex items-center gap-2.5">
                    {/* Same 3px of team colour the driver badges carry, so the
                        two tables read as one system. */}
                    <span
                      aria-hidden
                      className="h-6 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: teamColor(team.team) }}
                    />
                    <span className="font-medium text-text">
                      {displayTeamName(team.team)}
                    </span>
                  </span>
                </th>
                <td className="gpp-mono hidden px-3 py-2.5 text-right text-text-muted sm:table-cell">
                  {team.wins}
                </td>
                <td className="gpp-mono hidden px-3 py-2.5 text-right text-text-muted sm:table-cell">
                  {team.podiums}
                </td>
                <td className="gpp-mono px-2 py-2.5 text-right font-semibold text-text sm:px-3">
                  {team.points}
                  <PointsBar
                    points={team.points}
                    leaderPoints={leaderPoints}
                    color={teamColor(team.team)}
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
