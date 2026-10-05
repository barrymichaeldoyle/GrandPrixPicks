/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { ConvexError } from 'convex/values';
import { beforeEach, describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import {
  isoUtc,
  parseEpochInput,
  resolveStartingGrid,
  sessionsForWeekend,
  validatePublishInput,
} from './raceNews';
import schema from './schema';

const NOW = Date.parse('2026-09-06T12:00:00Z');

const base = {
  raceName: 'Italian Grand Prix',
  hasSprint: false,
  affectsSessions: ['race'],
  sourceUrl: 'https://www.formula1.com/en/latest/article/example',
  now: NOW,
};

describe('sessionsForWeekend', () => {
  it('lists two sessions on a conventional weekend', () => {
    expect(sessionsForWeekend(false)).toEqual(['quali', 'race']);
  });

  it('lists four on a sprint weekend', () => {
    expect(sessionsForWeekend(true)).toEqual([
      'sprint_quali',
      'sprint',
      'quali',
      'race',
    ]);
  });
});

describe('validatePublishInput', () => {
  it('accepts a publishable item', () => {
    expect(validatePublishInput(base)).toBeNull();
  });

  it('refuses an item that changes no session', () => {
    // The editorial rule, enforced rather than documented: if nothing is
    // affected, this is a story for a write-up page and not for the feed.
    const problem = validatePublishInput({ ...base, affectsSessions: [] });
    expect(problem?.message).toMatch(/at least one session/);
    expect(problem?.message).toMatch(/general news/);
  });

  it('allows general news without a session and rejects invented impact', () => {
    expect(
      validatePublishInput({
        ...base,
        category: 'general',
        affectsSessions: [],
      }),
    ).toBeNull();
    expect(
      validatePublishInput({ ...base, category: 'general' })?.message,
    ).toMatch(/cannot name affected sessions/);
  });

  it('refuses a session the weekend does not run', () => {
    // Catching this before publish is the point: otherwise the weekend card
    // flags a tab that is not on screen.
    const problem = validatePublishInput({
      ...base,
      affectsSessions: ['sprint'],
    });
    expect(problem?.message).toMatch(/has no sprint session/);
    // The message names what the weekend does run, so the caller can fix the
    // call without going to look it up.
    expect(problem?.message).toMatch(/quali, race/);
  });

  it('allows sprint sessions on a sprint weekend', () => {
    expect(
      validatePublishInput({
        ...base,
        hasSprint: true,
        affectsSessions: ['sprint_quali', 'sprint'],
      }),
    ).toBeNull();
  });

  it('names every impossible session at once', () => {
    // One run, one fix. Reporting them one at a time would make an agent
    // iterate against production.
    const problem = validatePublishInput({
      ...base,
      affectsSessions: ['sprint', 'sprint_quali'],
    });
    expect(problem?.message).toMatch(/sprint, sprint_quali/);
  });

  it('accepts several real sessions', () => {
    expect(
      validatePublishInput({ ...base, affectsSessions: ['quali', 'race'] }),
    ).toBeNull();
  });

  it('refuses a source that is not a full URL', () => {
    expect(
      validatePublishInput({ ...base, sourceUrl: 'formula1.com' })?.message,
    ).toMatch(/full http/);
    expect(validatePublishInput({ ...base, sourceUrl: '' })?.message).toMatch(
      /full http/,
    );
  });

  it('accepts http as well as https', () => {
    expect(
      validatePublishInput({ ...base, sourceUrl: 'http://example.com/a' }),
    ).toBeNull();
  });

  it('accepts an item with no source date', () => {
    // Not every source carries one, and a blank date is better than a guess.
    expect(validatePublishInput(base)).toBeNull();
  });

  it('accepts a source date in the past', () => {
    expect(
      validatePublishInput({
        ...base,
        sourcePublishedAt: Date.parse('2026-09-05T09:30:00Z'),
      }),
    ).toBeNull();
  });

  it('refuses a source date given in seconds', () => {
    // The mistake to expect: article metadata is usually in seconds, and a
    // validator that only checks the type would date a 2026 penalty to 1970.
    const seconds = Math.floor(Date.parse('2026-09-05T09:30:00Z') / 1000);
    const problem = validatePublishInput({
      ...base,
      sourcePublishedAt: seconds,
    });
    expect(problem).toMatchObject({
      code: 'SOURCE_PUBLISHED_AT_SECONDS',
      sourcePublishedAt: seconds,
      sourcePublishedAtIso: isoUtc(seconds),
      suggestedSourcePublishedAt: seconds * 1000,
    });
    expect(problem?.message).toContain(String(seconds * 1000));
    expect(problem?.message).toContain(isoUtc(seconds)!);
  });

  it('refuses a source date in the future with the value and bounds', () => {
    const stamp = NOW + 3 * 24 * 60 * 60 * 1000;
    const latestAllowed = NOW + 24 * 60 * 60 * 1000;
    const problem = validatePublishInput({
      ...base,
      sourcePublishedAt: stamp,
    });
    expect(problem).toMatchObject({
      code: 'SOURCE_PUBLISHED_AT_IN_FUTURE',
      sourcePublishedAt: stamp,
      sourcePublishedAtIso: isoUtc(stamp),
      serverNowIso: isoUtc(NOW),
      latestAllowedIso: isoUtc(latestAllowed),
    });
    expect(problem?.message).toContain(isoUtc(stamp)!);
    expect(problem?.message).toContain(isoUtc(latestAllowed)!);
  });

  it('allows a source date slightly ahead of us', () => {
    // A source stamps its own timezone, and occasionally runs ahead of ours.
    // A few hours is a timezone, not a typo.
    expect(
      validatePublishInput({
        ...base,
        sourcePublishedAt: NOW + 6 * 60 * 60 * 1000,
      }),
    ).toBeNull();
  });

  it('reports the session problem before the URL problem', () => {
    // Both are wrong here. The session rule is the editorial one, so it is the
    // more useful thing to hear first.
    expect(
      validatePublishInput({
        ...base,
        affectsSessions: [],
        sourceUrl: 'nope',
      })?.message,
    ).toMatch(/at least one session/);
  });
});

describe('parseEpochInput', () => {
  it('passes through milliseconds', () => {
    expect(parseEpochInput(1_757_067_000_000, 'sourcePublishedAt')).toEqual({
      ok: true,
      ms: 1_757_067_000_000,
    });
  });

  it('accepts an ISO string with an explicit offset', () => {
    expect(
      parseEpochInput('2026-09-28T10:00:00+02:00', 'sourcePublishedAt'),
    ).toEqual({
      ok: true,
      ms: Date.parse('2026-09-28T08:00:00.000Z'),
    });
  });

  it('accepts a Zulu ISO string', () => {
    expect(
      parseEpochInput('2026-09-28T08:00:00Z', 'sourcePublishedAt'),
    ).toEqual({
      ok: true,
      ms: Date.parse('2026-09-28T08:00:00.000Z'),
    });
  });

  it('refuses a string that is not a timestamp', () => {
    const result = parseEpochInput('next Tuesday', 'sourcePublishedAt');
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.problem).toMatchObject({
      code: 'SOURCE_PUBLISHED_AT_INVALID',
    });
    expect(result.problem.message).toMatch(/not a valid timestamp/);
  });

  it('leaves undefined alone', () => {
    expect(parseEpochInput(undefined, 'sourcePublishedAt')).toEqual({
      ok: true,
      ms: undefined,
    });
  });
});

describe('isoUtc', () => {
  it('echoes a full UTC ISO timestamp', () => {
    expect(isoUtc(Date.parse('2026-09-28T08:00:00Z'))).toBe(
      '2026-09-28T08:00:00.000Z',
    );
  });

  it('returns undefined when there is no stamp', () => {
    expect(isoUtc(undefined)).toBeUndefined();
  });
});

describe('resolveStartingGrid', () => {
  const roster = new Map([
    ['GAS', { displayName: 'Pierre Gasly', team: 'Alpine', number: 10 }],
    ['RUS', { displayName: 'George Russell', team: 'Mercedes', number: 63 }],
  ]);

  it('puts names and teams on the stored rows, in starting order', () => {
    expect(
      resolveStartingGrid(
        [
          { position: 2, code: 'RUS' },
          { position: 1, code: 'GAS' },
        ],
        (code) => roster.get(code),
      ),
    ).toEqual([
      {
        position: 1,
        code: 'GAS',
        displayName: 'Pierre Gasly',
        team: 'Alpine',
        number: 10,
      },
      {
        position: 2,
        code: 'RUS',
        displayName: 'George Russell',
        team: 'Mercedes',
        number: 63,
      },
    ]);
  });

  it('keeps the row for a code the roster no longer knows', () => {
    // A missing news badge can be dropped; a missing grid row cannot. Publishing
    // validates every code, so the only way here is a roster edit afterwards,
    // and a grid silently one row short is exactly what nobody would spot.
    const [entry] = resolveStartingGrid(
      [{ position: 1, code: 'XXX' }],
      () => undefined,
    );
    expect(entry).toEqual({
      position: 1,
      code: 'XXX',
      displayName: 'XXX',
      team: null,
      // Nothing to resolve a number from either; the row still renders.
      number: null,
    });
  });

  it('carries a note through', () => {
    const [entry] = resolveStartingGrid(
      [{ position: 1, code: 'GAS', note: '3-place penalty' }],
      (code) => roster.get(code),
    );
    expect(entry?.note).toBe('3-place penalty');
  });
});

/// Integration coverage for the publish path: dry-run reports and ConvexError
/// shapes for sourcePublishedAt. Unit checks above cover the pure helpers.

const modules = import.meta.glob('./**/*.ts');

const item = {
  raceSlug: 'italy-2026',
  key: 'antonelli-grid-penalty',
  headline: 'Antonelli takes a grid penalty at Monza',
  body: 'Full power unit change. Ten places minimum.',
  affectsSessions: ['race' as const],
  sourceName: 'Formula 1',
  sourceUrl: 'https://www.formula1.com/en/latest/article/example',
};

describe('raceNews.publish sourcePublishedAt', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert('races', {
        season: 2026,
        round: 13,
        name: 'Italian Grand Prix',
        slug: 'italy-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_000,
        status: 'upcoming',
        createdAt: 100,
        updatedAt: 100,
      });
    });
  });

  it('throws a structured ConvexError for a future stamp', async () => {
    const stamp = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const error = await t
      .mutation(internal.raceNews.publish, {
        ...item,
        sourcePublishedAt: stamp,
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConvexError);
    const data = (
      error as ConvexError<{
        code: string;
        message: string;
        sourcePublishedAt: number;
        sourcePublishedAtIso: string;
        latestAllowedIso: string;
      }>
    ).data;
    expect(data).toMatchObject({
      code: 'SOURCE_PUBLISHED_AT_IN_FUTURE',
      sourcePublishedAt: stamp,
      sourcePublishedAtIso: isoUtc(stamp),
    });
    expect(data.message).toContain(isoUtc(stamp)!);
    expect(data.latestAllowedIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('reports a future stamp on dry run instead of throwing', async () => {
    const stamp = Date.now() + 3 * 24 * 60 * 60 * 1000;
    const preview = await t.mutation(internal.raceNews.publish, {
      ...item,
      sourcePublishedAt: stamp,
      dryRun: true,
    });
    expect(preview).toMatchObject({
      dryRun: true,
      sourcePublished: isoUtc(stamp),
      validationProblem: {
        code: 'SOURCE_PUBLISHED_AT_IN_FUTURE',
        sourcePublishedAt: stamp,
        sourcePublishedAtIso: isoUtc(stamp),
      },
    });
  });

  it('echoes sourcePublished as a full UTC ISO on dry run and publish', async () => {
    const stamp = Date.parse('2026-09-03T09:00:00Z');
    const preview = await t.mutation(internal.raceNews.publish, {
      ...item,
      sourcePublishedAt: stamp,
      dryRun: true,
    });
    expect(preview.sourcePublished).toBe('2026-09-03T09:00:00.000Z');
    expect(preview.validationProblem).toBeUndefined();

    const published = await t.mutation(internal.raceNews.publish, {
      ...item,
      sourcePublishedAt: '2026-09-03T11:00:00+02:00',
    });
    expect(published.sourcePublished).toBe('2026-09-03T09:00:00.000Z');
  });

  it('accepts an ISO string with an explicit offset on publish', async () => {
    const published = await t.mutation(internal.raceNews.publish, {
      ...item,
      sourcePublishedAt: '2026-09-28T10:00:00+02:00',
    });
    expect(published.sourcePublished).toBe('2026-09-28T08:00:00.000Z');
  });

  it('reports a seconds-epoch stamp on dry run', async () => {
    const seconds = Math.floor(Date.parse('2026-09-05T09:30:00Z') / 1000);
    const preview = await t.mutation(internal.raceNews.publish, {
      ...item,
      sourcePublishedAt: seconds,
      dryRun: true,
    });
    expect(preview).toMatchObject({
      dryRun: true,
      sourcePublished: isoUtc(seconds),
      validationProblem: {
        code: 'SOURCE_PUBLISHED_AT_SECONDS',
        sourcePublishedAt: seconds,
        suggestedSourcePublishedAt: seconds * 1000,
      },
    });
  });
});
