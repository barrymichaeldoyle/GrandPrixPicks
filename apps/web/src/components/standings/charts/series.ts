import { displayTeamName } from '@/lib/display';
import {
  type CalendarRound,
  type ConstructorRow,
  type DriverRow,
  roundCode,
} from '@/lib/standings';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

/** One line on a chart: an entrant, their colour, and their season so far. */
export type ChartSeries = {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  /**
   * Team-mates share a colour, so the second car is drawn dashed and with
   * hollow markers. Colour is never the only difference between two lines.
   */
  dashed: boolean;
  position: number;
  points: number;
  /** Taken off the query's own row shape, so an added field reaches the
      charts without being restated here. */
  rounds: DriverRow['pointsByRound'];
};

/** The x-axis: the rounds that have been scored, labelled by Grand Prix. */
export type ChartRound = {
  round: number;
  code: string;
  name: string;
  hasSprint: boolean;
};

export function chartRounds(
  calendar: readonly CalendarRound[],
  scoredRounds: readonly number[],
): ChartRound[] {
  const byRound = new Map(calendar.map((race) => [race.round, race]));
  return [...scoredRounds]
    .sort((a, b) => a - b)
    .map((round) => {
      const race = byRound.get(round);
      return {
        round,
        code: race ? roundCode(race.name) : `R${round}`,
        name: race?.name ?? `Round ${round}`,
        hasSprint: race?.hasSprint ?? false,
      };
    });
}

function color(team: string | null): string {
  return (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR;
}

export function driverSeries(
  drivers: readonly DriverRow[],
  limit: number,
): ChartSeries[] {
  const seen = new Set<string>();
  return drivers.slice(0, limit).map((driver) => {
    const team = driver.team;
    const dashed = team !== null && seen.has(team);
    if (team) {
      seen.add(team);
    }
    return {
      key: driver.driverId as string,
      label: driver.displayName,
      shortLabel: driver.code,
      color: color(team),
      dashed,
      position: driver.position,
      points: driver.points,
      rounds: driver.pointsByRound,
    };
  });
}

export function constructorSeries(
  constructors: readonly ConstructorRow[],
): ChartSeries[] {
  return constructors.map((team) => ({
    key: team.team,
    label: displayTeamName(team.team),
    shortLabel: displayTeamName(team.team),
    color: color(team.team),
    dashed: false,
    position: team.position,
    points: team.points,
    rounds: team.pointsByRound,
  }));
}
