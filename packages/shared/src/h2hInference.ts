/**
 * Team-mate calls a Top 5 already answers.
 *
 * A Top 5 is an ordering, so it settles every duel it touches: a driver in it
 * finishes ahead of a team-mate who is not, and of two team-mates both in it
 * the higher slot finishes ahead. A duel neither driver appears in is left
 * open, because the Top 5 says nothing about it.
 *
 * The answer is a default, never a constraint. A player may back the other
 * driver (a hedge), and nothing here or downstream should stop or undo that.
 */
export function impliedH2HWinner<DriverId extends string>(
  driver1Id: DriverId,
  driver2Id: DriverId,
  topFive: ReadonlyArray<string>,
): DriverId | null {
  const slot1 = topFive.indexOf(driver1Id);
  const slot2 = topFive.indexOf(driver2Id);
  if (slot1 === -1 && slot2 === -1) {
    return null;
  }
  if (slot2 === -1) {
    return driver1Id;
  }
  if (slot1 === -1) {
    return driver2Id;
  }
  return slot1 < slot2 ? driver1Id : driver2Id;
}

/** {@link impliedH2HWinner} for every duel, keyed by matchup id. */
export function inferH2HPicks<
  MatchupId extends string,
  DriverId extends string,
>(
  matchups: ReadonlyArray<{
    matchupId: MatchupId;
    driver1Id: DriverId;
    driver2Id: DriverId;
  }>,
  topFive: ReadonlyArray<string>,
): Partial<Record<MatchupId, DriverId>> {
  const picks: Partial<Record<MatchupId, DriverId>> = {};
  if (topFive.length === 0) {
    return picks;
  }
  for (const { matchupId, driver1Id, driver2Id } of matchups) {
    const winner = impliedH2HWinner(driver1Id, driver2Id, topFive);
    if (winner !== null) {
      picks[matchupId] = winner;
    }
  }
  return picks;
}

/**
 * The call a saved duel pick should move to when its Top 5 changes, or null to
 * leave it alone.
 *
 * Only a pick that still agrees with the *old* Top 5 follows the new one. A
 * hedge disagreed with the old Top 5 by definition, so it never matches and is
 * never touched. A Top 5 that no longer mentions either driver has nothing to
 * say, so the pick stays as it is rather than being cleared.
 */
export function followedH2HPick<DriverId extends string>(params: {
  driver1Id: DriverId;
  driver2Id: DriverId;
  savedWinnerId: DriverId;
  previousTopFive: ReadonlyArray<string>;
  nextTopFive: ReadonlyArray<string>;
}): DriverId | null {
  const before = impliedH2HWinner(
    params.driver1Id,
    params.driver2Id,
    params.previousTopFive,
  );
  if (before === null || before !== params.savedWinnerId) {
    return null;
  }
  const after = impliedH2HWinner(
    params.driver1Id,
    params.driver2Id,
    params.nextTopFive,
  );
  return after !== null && after !== params.savedWinnerId ? after : null;
}
