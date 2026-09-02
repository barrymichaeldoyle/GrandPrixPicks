/**
 * Races whose official entry list is not yet published.
 *
 * The grid we serve is always the real one for the race's own round: who drives
 * for whom is a round-scoped fact, and rewinding to an earlier round to express
 * "we are not sure yet" would serve pairings that have already retired. Duel
 * picks made against a retired pairing are never scored, because results only
 * write `h2hResults` for matchups covering the race's round.
 *
 * So uncertainty is marked, not simulated: the last agreed lineup is offered as
 * pickable, and the seats that could still change carry a flag the pickers show
 * as `Unconfirmed`. That is also what makes this self-unwinding. Once the entry
 * list lands, either the lineup is confirmed (delete the entry here) or it
 * changed (declare the new pairing in `TEAMMATE_PAIRINGS_2026` and run
 * `seed:applyLineup`, the same as any other mid-season change).
 */
export type PendingEntryRace = {
  season: number;
  round: number;
  /**
   * Drivers holding a seat for this round that the entry list could still take
   * away. Codes must be drivers who are *in* the round's roster: this marks a
   * seat as provisional, it does not add anyone to the grid.
   */
  unconfirmedDriverCodes: readonly string[];
  /**
   * What is unsettled, in the pickers' own words. Lives beside the codes it
   * describes so a note can never name a race, a team or a driver that the
   * flagged grid underneath it does not.
   */
  note: string;
};

export const PENDING_ENTRY_RACES: Readonly<Record<string, PendingEntryRace>> =
  {};

export function pendingEntryForSlug(slug: string): PendingEntryRace | null {
  return PENDING_ENTRY_RACES[slug] ?? null;
}

export function hasPendingEntryList(slug: string): boolean {
  return slug in PENDING_ENTRY_RACES;
}

/** The note to show above a pending grid, or null when the entry is settled. */
export function pendingEntryNoteForSlug(slug: string): string | null {
  return pendingEntryForSlug(slug)?.note ?? null;
}

/** Slug for a calendar round that is still waiting on its entry list. */
export function pendingEntrySlugForCalendarRound(
  season: number,
  round: number,
): string | null {
  for (const [slug, config] of Object.entries(PENDING_ENTRY_RACES)) {
    if (config.season === season && config.round === round) {
      return slug;
    }
  }
  return null;
}

/**
 * Flags the seats this race's entry list could still change.
 *
 * Returns the roster untouched for every other race, so callers can pass any
 * slug through without branching.
 */
export function markPendingEntryDrivers<T extends { code: string }>(
  slug: string,
  drivers: readonly T[],
): Array<T & { entryUnconfirmed?: boolean }> {
  const pending = pendingEntryForSlug(slug);
  if (!pending) {
    return [...drivers];
  }
  return drivers.map((driver) =>
    pending.unconfirmedDriverCodes.includes(driver.code)
      ? { ...driver, entryUnconfirmed: true }
      : driver,
  );
}
