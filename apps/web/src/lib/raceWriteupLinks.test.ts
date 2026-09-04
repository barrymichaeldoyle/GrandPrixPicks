import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { listRaceWriteups } from './raceWriteups';

/**
 * Every write-up has to end on the round's picks and the board they feed.
 *
 * Both links live in components (`RaceWriteupClosingPanel` and, where the
 * picker is inline, `DeferredRaceWriteupPicks`), so the thing that can break
 * is a new write-up route that renders neither. That is a whole-page property
 * no component test can see, and the pages are too heavy to render here, so
 * this reads the routes as source: the check is cheap and the failure it
 * catches is a page search sends readers to that leads nowhere.
 */
const LINK_BEARING_SECTIONS = [
  'RaceWriteupClosingPanel',
  'DeferredRaceWriteupPicks',
];

// Vitest runs with `apps/web` as the working directory.
const ROUTES_DIR = `${process.cwd()}/src/routes/`;

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
