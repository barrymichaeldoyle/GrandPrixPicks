/**
 * Whether the race that just ran should lead the app, ahead of the picker for
 * the next round.
 *
 * Shared because web and mobile answer it about the same facts and must not
 * drift: a player who opens one and then the other should not find the weekend
 * promoted in one place and buried in the other.
 *
 * The interesting condition is the last one. While the picker below is still
 * showing this same race, the recap only earns its place if it has something
 * the picker does not:
 *
 * - `live` and `scored` do. One is the running order as it stands, the other is
 *   the result. Both are news about a race the picker can only show saved picks
 *   for.
 * - `pending` does not. It is the same race name and nothing else, and every
 *   Grand Prix passes through it: `races.status` only becomes `finished` when
 *   the race result is published, so until then `getCurrentWeekend` keeps
 *   returning that race. Promoting it put "Bahrain Grand Prix - Results
 *   pending" directly above a "Bahrain Grand Prix" picks card.
 *
 * Once the race is scored the picker moves on to the next round by itself, and
 * the recap is the only place that weekend still appears.
 */
export function promotedRaceRecap<
  T extends { race: { id: string }; status: 'pending' | 'live' | 'scored' },
>(
  recap: T | null | undefined,
  currentWeekendRaceId: string | undefined,
  isWithinWindow: boolean,
): T | null {
  if (!recap || !isWithinWindow) {
    return null;
  }
  if (recap.race.id !== currentWeekendRaceId) {
    return recap;
  }
  return recap.status === 'pending' ? null : recap;
}
