/**
 * Whether the race that just ran should lead the app, ahead of the picker for
 * the next round.
 *
 * Shared because web and mobile answer it about the same two facts and must not
 * drift: a player who opens one and then the other should not find the weekend
 * promoted in one place and buried in the other.
 *
 * Two conditions, and the second is the interesting one. The recap must not be
 * promoted while the picker below is still showing the same race, which is the
 * state every Grand Prix passes through: `races.status` only becomes `finished`
 * when the race result is published, and until then `getCurrentWeekend` keeps
 * returning that race. Without this check the two hours between lights out and
 * the flag put "Bahrain Grand Prix - Results pending" directly above a "Bahrain
 * Grand Prix" picks card.
 *
 * OpenF1 publishes within minutes of the flag, so on a normal weekend this
 * hands over cleanly: the picker advances to the next round in the same update
 * that gives the recap its scores. What survives is the case the pending state
 * is actually for, a race that has dropped out of the picker without ever being
 * scored, where saying so is better than silently leading with the next round.
 */
export function promotedRaceRecap<T extends { race: { id: string } }>(
  recap: T | null | undefined,
  currentWeekendRaceId: string | undefined,
  isWithinWindow: boolean,
): T | null {
  if (!recap || !isWithinWindow) {
    return null;
  }
  return recap.race.id === currentWeekendRaceId ? null : recap;
}
