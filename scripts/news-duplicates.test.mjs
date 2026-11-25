import assert from 'node:assert/strict';
import test from 'node:test';

import { findDuplicates } from './news-duplicates.mjs';

const NOW = Date.parse('2026-11-19T16:00:00Z');
const HOUR = 60 * 60 * 1000;
const SKY_DAKAR =
  'https://www.skysports.com/f1/news/13612958/fernando-alonso-aston-martin-driver-to-race-in-dakar-rally-ahead-of-2027-f1-season-in-return-to-rally-raid-event';

// Live prod stories the November duplicates collided with.
const live = [
  {
    scope: 'global',
    key: 'alonso-dakar-2027-aston-martin',
    headline: 'Alonso will race the Dakar Rally for Aston Martin in January',
    sourceUrl: SKY_DAKAR,
    publishedAt: NOW - 48 * HOUR,
  },
  {
    scope: 'global',
    key: 'cadillac-bottas-2027-confirmed',
    headline: 'Cadillac confirms Bottas for 2027 alongside Perez',
    sourceUrl:
      'https://www.racefans.net/2026/11/18/official-bottas-to-stay-at-cadillacin-2027/',
    publishedAt: NOW - 10 * HOUR,
  },
  {
    scope: 'italy-2026',
    key: 'lawson-grid-penalty',
    headline: 'Lawson starts from the pit lane at Monza',
    sourceUrl: 'https://www.fia.com/documents/monza-decision',
    publishedAt: NOW - 2 * HOUR,
  },
  {
    scope: 'italy-2026',
    key: 'audi-tsunoda-appeal-hearing-date',
    headline: "Audi's Tsunoda appeal will be heard on 25 November",
    sourceUrl: 'https://www.the-race.com/formula-1/audi-tsunoda-appeal/',
    publishedAt: NOW - 3 * HOUR,
  },
  {
    scope: 'las-vegas-2026',
    key: 'las-vegas-fp1-washout',
    headline: 'No lap times set in Las Vegas FP1',
    sourceUrl: 'https://www.formula1.com/en/results/las-vegas/fp1',
    publishedAt: NOW - 20 * HOUR,
  },
  {
    scope: 'global',
    key: 'retracted-story',
    headline: 'Hamilton will race the Dakar Rally for Ferrari',
    sourceUrl: 'https://example.com/retracted',
    publishedAt: NOW - HOUR,
    active: false,
  },
];

test('the same article under a new key is refused, naming the key to reuse', () => {
  const { refusals } = findDuplicates(
    [
      {
        scope: 'global',
        key: 'alonso-dakar-rally-2027',
        headline: 'Alonso will race the 2027 Dakar Rally for Aston Martin',
        sourceUrl: `${SKY_DAKAR}/`,
      },
    ],
    live,
    NOW,
  );
  assert.equal(refusals.length, 1);
  assert.match(refusals[0], /reuse key "alonso-dakar-2027-aston-martin"/i);
});

test('a race story repeated as global news is refused', () => {
  const { refusals } = findDuplicates(
    [
      {
        scope: 'global',
        key: 'audi-tsunoda-monza-appeal-hearing',
        headline: "Audi's Tsunoda appeal will be heard on 25 November",
        sourceUrl: 'https://the-race.com/formula-1/audi-tsunoda-appeal',
      },
    ],
    live,
    NOW,
  );
  assert.equal(refusals.length, 1);
});

test('one stewards document behind two drivers is two stories', () => {
  const result = findDuplicates(
    [
      {
        scope: 'italy-2026',
        key: 'alonso-pit-lane-start',
        headline: 'Alonso starts from the pit lane at Monza',
        sourceUrl: 'https://www.fia.com/documents/monza-decision',
      },
    ],
    live,
    NOW,
  );
  assert.deepEqual(result, { refusals: [], warnings: [] });
});

test('the same news from another outlet is a warning, not a refusal', () => {
  const { refusals, warnings } = findDuplicates(
    [
      {
        scope: 'global',
        key: 'bottas-cadillac-2027-confirmed',
        headline: 'Bottas stays at Cadillac for 2027',
        sourceUrl:
          'https://www.motorsport.com/f1/news/valtteri-bottas-retains-cadillac-f1-seat-for-2027/10875159/',
      },
    ],
    live,
    NOW,
  );
  assert.equal(refusals.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /POSSIBLE DUPLICATE of global\/cadillac-bottas/);
});

test("the race's own place name does not make two stories one", () => {
  const result = findDuplicates(
    [
      {
        scope: 'las-vegas-2026',
        key: 'las-vegas-starting-grid',
        headline: 'The Las Vegas grid is set',
        sourceUrl: 'https://www.formula1.com/en/results/las-vegas/grid',
      },
    ],
    live,
    NOW,
  );
  assert.deepEqual(result, { refusals: [], warnings: [] });
});

test('updating an existing key is never checked', () => {
  const result = findDuplicates(
    [
      {
        scope: 'global',
        key: 'alonso-dakar-2027-aston-martin',
        headline: 'Alonso will race the Dakar Rally for Aston Martin',
        sourceUrl: SKY_DAKAR,
      },
    ],
    live,
    NOW,
  );
  assert.deepEqual(result, { refusals: [], warnings: [] });
});

test('notDuplicateOf clears a named story', () => {
  const result = findDuplicates(
    [
      {
        scope: 'global',
        key: 'alonso-dakar-stage-one',
        headline:
          'Alonso will race the Dakar Rally for Aston Martin in January',
        sourceUrl: SKY_DAKAR,
        notDuplicateOf: ['alonso-dakar-2027-aston-martin'],
      },
    ],
    live,
    NOW,
  );
  assert.equal(result.refusals.length, 0);
});

test('retracted stories and other races are not compared', () => {
  const result = findDuplicates(
    [
      {
        scope: 'global',
        key: 'hamilton-dakar',
        headline: 'Hamilton will race the Dakar Rally for Ferrari',
        sourceUrl: 'https://example.com/retracted',
      },
      {
        scope: 'brazil-2026',
        key: 'lawson-pit-lane-brazil',
        headline: 'Lawson starts from the pit lane at Interlagos',
        sourceUrl: 'https://www.fia.com/documents/brazil-decision',
      },
    ],
    live,
    NOW,
  );
  assert.deepEqual(result, { refusals: [], warnings: [] });
});

test('two items in one batch are checked against each other', () => {
  const item = {
    scope: 'global',
    headline: 'Mekies extends his Red Bull contract to 2031',
    sourceUrl: 'https://www.redbull.com/mekies-2031',
  };
  const { refusals } = findDuplicates(
    [
      { ...item, key: 'mekies-red-bull-2031' },
      { ...item, key: 'red-bull-mekies-2031' },
    ],
    [],
    NOW,
  );
  assert.equal(refusals.length, 1);
  assert.match(refusals[0], /global\/red-bull-mekies-2031/);
});

// 23 Nov 2026: the same Autosport article went out twice under new keys,
// and a Crash report of the same news followed the next day.
const ENGINE_SUPPLY =
  'https://www.autosport.com/f1/news/f1-set-to-reduce-customer-teams-as-key-2030-details-emerge/10877055/';
const engineSupply = {
  scope: 'global',
  key: 'f1-2030-two-team-engine-supply-limit',
  headline: 'F1 plans a two-team limit for each engine manufacturer from 2030',
  sourceUrl: ENGINE_SUPPLY,
  publishedAt: NOW - 10 * HOUR,
};

test('headlines that name no one are matched on their words', () => {
  const { refusals } = findDuplicates(
    [
      {
        scope: 'global',
        key: '2030-engine-two-team-supply-limit',
        headline: 'F1 plans a two-team supply limit per engine maker from 2030',
        sourceUrl: ENGINE_SUPPLY,
      },
    ],
    [engineSupply],
    NOW,
  );
  assert.equal(refusals.length, 1);
});

test('a plural reworded as a singular still counts as the same word', () => {
  const { warnings } = findDuplicates(
    [
      {
        scope: 'global',
        key: 'engine-makers-two-team-supply-cap-2030',
        headline:
          'F1 engine makers reportedly agree to supply two teams each from 2030',
        sourceUrl: 'https://www.crash.net/f1/news/1110840/1/engine-shake-up',
      },
    ],
    [
      {
        ...engineSupply,
        headline: 'F1 plans a two-team supply limit per engine maker from 2030',
      },
    ],
    NOW,
  );
  assert.equal(warnings.length, 1);
});
