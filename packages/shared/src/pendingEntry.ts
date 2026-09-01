/**
 * Races whose official entry list is not yet published.
 *
 * Until it is, callers must not serve a substitute grid as confirmed. The
 * `displayRound` is the last grid everyone agrees on; the `raceRound` is the
 * calendar round that is still waiting on the entry.
 */
export type PendingEntryRace = {
  season: number;
  raceRound: number;
  displayRound: number;
};

export const PENDING_ENTRY_RACES: Readonly<
  Record<string, PendingEntryRace>
> = {
  // Monza 2026: Red Bull has not confirmed Hadjar's return or Lawson/Tsunoda
  // cover roles. Show the pre-Zandvoort grid rather than the Dutch GP
  // substitutes until the entry is out.
  'italy-2026': { season: 2026, raceRound: 13, displayRound: 11 },
};

export function hasPendingEntryList(slug: string): boolean {
  return slug in PENDING_ENTRY_RACES;
}

/** Slug for a calendar round that is still waiting on its entry list. */
export function pendingEntrySlugForCalendarRound(
  season: number,
  round: number,
): string | null {
  for (const [slug, config] of Object.entries(PENDING_ENTRY_RACES)) {
    if (config.season === season && config.raceRound === round) {
      return slug;
    }
  }
  return null;
}

/** Which round's grid to show while an entry list is still pending. */
export function lineupRoundForCalendarRound(
  season: number,
  round: number,
): number {
  for (const config of Object.values(PENDING_ENTRY_RACES)) {
    if (config.season === season && config.raceRound === round) {
      return config.displayRound;
    }
  }
  return round;
}

/** Driver codes that remain unconfirmed while the entry list is pending. */
export const PENDING_ENTRY_UNCONFIRMED_DRIVER_CODES = ['HAD'] as const;

export function markPendingEntryDrivers<T extends { code: string }>(
  slug: string,
  drivers: readonly T[],
): Array<T & { entryUnconfirmed?: boolean }> {
  if (!hasPendingEntryList(slug)) {
    return [...drivers];
  }
  return drivers.map((driver) =>
    (PENDING_ENTRY_UNCONFIRMED_DRIVER_CODES as readonly string[]).includes(
      driver.code,
    )
      ? { ...driver, entryUnconfirmed: true }
      : driver,
  );
}
