import { describe, expect, it } from 'vitest';

import {
  resolveStartingGrid,
  sessionsForWeekend,
  validatePublishInput,
} from './raceNews';

const base = {
  raceName: 'Italian Grand Prix',
  hasSprint: false,
  affectsSessions: ['race'],
  sourceUrl: 'https://www.formula1.com/en/latest/article/example',
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
    ['GAS', { displayName: 'Pierre Gasly', team: 'Alpine' }],
    ['RUS', { displayName: 'George Russell', team: 'Mercedes' }],
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
      { position: 1, code: 'GAS', displayName: 'Pierre Gasly', team: 'Alpine' },
      {
        position: 2,
        code: 'RUS',
        displayName: 'George Russell',
        team: 'Mercedes',
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
