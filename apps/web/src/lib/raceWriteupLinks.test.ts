import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { listRaceWriteups } from './raceWriteups';

/**
 * Every write-up has to end on the round's picks and the board they feed.
 *
 * Both links live in components (`RaceWriteupClosingPanel` and, where the
 * picker is inline, `DeferredRaceWriteupPicks`). Most write-ups render those
 * through `RaceWriteupFinish`, so the thing that can break is a new write-up
 * route that renders none of the three. That is a whole-page property no
 * component test can see, and the pages are too heavy to render here, so this
 * reads the routes as source: the check is cheap and the failure it catches is
 * a page search sends readers to that leads nowhere.
 */
const LINK_BEARING_SECTIONS = [
  'RaceWriteupClosingPanel',
  'DeferredRaceWriteupPicks',
  'RaceWriteupFinish',
];

// Vitest runs with `apps/web` as the working directory.
const ROUTES_DIR = `${process.cwd()}/src/routes/`;

/**
 * The predictions hub is not a write-up, but it carries the same obligation:
 * it is the footer's fallback when the current round has no write-up, and
 * write-ups still link back to it. It spent its first life describing the
 * weekend and handing off to `/races/$raceSlug`, which made a chrome link
 * open onto a page that could not take a prediction.
 */
describe('predictions hub', () => {
  it('takes the picks on the page rather than handing off', () => {
    const source = readFileSync(
      `${ROUTES_DIR}f1-predictions-this-weekend.tsx`,
      'utf8',
    );

    expect(source).toContain('<DeferredRaceWriteupPicks');
    // The header button has to reach it without a navigation, or the section
    // below is just a longer corridor.
    expect(source).toContain('RACE_WRITEUP_PICKS_ANCHOR');
  });
});

describe('race write-up outbound links', () => {
  for (const writeup of listRaceWriteups()) {
    it(`${writeup.to} ends on the picks and the leaderboard`, () => {
      const source = readFileSync(
        `${ROUTES_DIR}${writeup.to.slice(1)}.tsx`,
        'utf8',
      );

      expect(
        LINK_BEARING_SECTIONS.some((section) => source.includes(`<${section}`)),
        `${writeup.to} renders neither ${LINK_BEARING_SECTIONS.join(' nor ')}`,
      ).toBe(true);
    });
  }
});
