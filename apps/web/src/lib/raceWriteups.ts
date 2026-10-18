import { getCountryCodeForRace } from '@/lib/raceCountries';
import { getRaceWriteup } from '@grandprixpicks/shared/raceWriteups';

/**
 * The write-up registry lives in `@grandprixpicks/shared/raceWriteups` so
 * mobile reads the same entries. Web-only helpers stay here.
 */
export {
  getRaceWriteup,
  getRaceWriteupReviewedAt,
  listRaceWriteups,
  type RaceWriteup,
} from '@grandprixpicks/shared/raceWriteups';

/**
 * The site-footer preview for a weekend: flag, destination, and a name that
 * stands on its own out of context.
 *
 * Null when that round has no write-up. The footer then falls back to the
 * evergreen predictions hub rather than inventing a preview that does not
 * exist.
 */
export function footerWeekendPreview(raceSlug: string | undefined): {
  to: string;
  label: string;
  countryCode: string | null;
} | null {
  const writeup = getRaceWriteup(raceSlug);
  if (!writeup || !raceSlug) {
    return null;
  }
  return {
    to: writeup.to,
    label: `${writeup.venueName} Weekend News`,
    countryCode: getCountryCodeForRace({ slug: raceSlug }),
  };
}

/**
 * The round after `round` on the season calendar, shaped for
 * `RaceWriteupNextRound`, or null after the last round.
 *
 * From the loader's season list rather than the registry, which is keyed by
 * slug and not in calendar order.
 */
export function followingRound(
  races: readonly { slug: string; name: string; round: number }[],
  round: number,
): { slug: string; name: string; round: number } | null {
  const next = races.find((race) => race.round === round + 1);
  return next ? { slug: next.slug, name: next.name, round: next.round } : null;
}
