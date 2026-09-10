import { getCountryCodeForRaceSlug } from '@grandprixpicks/shared/raceCountries';

/** ISO 3166-1 alpha-2 country code for a race's flag image. */
export function getCountryCodeForRace(race: { slug: string }): string | null {
  return getCountryCodeForRaceSlug(race.slug);
}
