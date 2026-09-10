import { describe, expect, it } from 'vitest';
import { getCountryCodeForRaceSlug } from '@grandprixpicks/shared/raceCountries';

import { F1_RACES_2026 } from './seed';

/**
 * Every round on the calendar has to fly a flag.
 *
 * Web and mobile each kept their own slug→country map until they drifted:
 * mobile's had no `britain`, `madrid` or `abu-dhabi`, so three 2026 rounds
 * rendered with no flag on the home hero, the picks header, the recap card,
 * the leaderboard and every feed card. The map is shared now, and this is what
 * makes adding a round without a flag fail rather than ship.
 */
describe('race flags', () => {
  it.each(F1_RACES_2026.map((race) => race.slug))(
    'resolves a country code for %s',
    (slug) => {
      expect(getCountryCodeForRaceSlug(slug)).toMatch(/^[a-z]{2}$/);
    },
  );
});
