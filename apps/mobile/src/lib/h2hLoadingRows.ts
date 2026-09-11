import {
  currentPairings,
  teamStandingsIndex,
} from '@grandprixpicks/shared/teams';

/**
 * The duels to draw while H2H picks are in flight.
 *
 * Copied from web's H2HPicksDialog: the current pairings only, sorted into
 * this season's constructors order when we have it, else last season.
 */
export function loadingRowsFor(teamOrder: readonly string[] | undefined) {
  const liveIndex = new Map(teamOrder?.map((team, index) => [team, index]));
  function rank(team: string): number {
    return liveIndex.get(team) ?? liveIndex.size;
  }

  return [...currentPairings()].sort(
    (a, b) =>
      rank(a.team) - rank(b.team) ||
      teamStandingsIndex(a.team) - teamStandingsIndex(b.team) ||
      a.team.localeCompare(b.team),
  );
}
