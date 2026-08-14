import { getCircuitForRace } from './circuits';

/**
 * IANA timezone for a race's track-local session times.
 *
 * A timezone is a property of the *ground*, not of the Grand Prix's name, so
 * this now derives from the circuit a race is run on rather than guessing from
 * the race slug. See `circuits.ts` for why that distinction earns its keep.
 *
 * @param slug — a race slug, with or without its season suffix
 */
export function getRaceTimeZoneFromSlug(slug: string): string | undefined {
  return getCircuitForRace(slug)?.timeZone;
}
