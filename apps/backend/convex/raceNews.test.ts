import { describe, expect, it } from 'vitest';

import {
  resolveStartingGrid,
  sessionsForWeekend,
  validatePublishInput,
} from './raceNews';

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
    expect(problem).toMatch(/at least one session/);
    expect(problem).toMatch(/write-up page/);
  });

  it('refuses a session the weekend does not run', () => {
    // Catching this before publish is the point: otherwise the weekend card
    // flags a tab that is not on screen.
    const problem = validatePublishInput({
      ...base,
      affectsSessions: ['sprint'],
    });
    expect(problem).toMatch(/has no sprint session/);
    // The message names what the weekend does run, so the caller can fix the
    // call without going to look it up.
    expect(problem).toMatch(/quali, race/);
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
    expect(problem).toMatch(/sprint, sprint_quali/);
  });

  it('accepts several real sessions', () => {
    expect(
      validatePublishInput({ ...base, affectsSessions: ['quali', 'race'] }),
    ).toBeNull();
  });

  it('refuses a source that is not a full URL', () => {
    expect(
      validatePublishInput({ ...base, sourceUrl: 'formula1.com' }),
    ).toMatch(/full http/);
    expect(validatePublishInput({ ...base, sourceUrl: '' })).toMatch(
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
    expect(problem).toMatch(/seconds, not milliseconds/);
    // The message carries the corrected value, so the caller does not do the
    // arithmetic itself.
    expect(problem).toContain(String(seconds * 1000));
  });

  it('refuses a source date in the future', () => {
    expect(
      validatePublishInput({
        ...base,
        sourcePublishedAt: NOW + 3 * 24 * 60 * 60 * 1000,
      }),
    ).toMatch(/in the future/);
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
      }),
    ).toMatch(/at least one session/);
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
