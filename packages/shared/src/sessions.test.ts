import { describe, expect, it } from 'vitest';

import { getMissingEarlierSessions } from './sessions';

describe('getMissingEarlierSessions', () => {
  it('requires quali before race on a regular weekend', () => {
    expect(getMissingEarlierSessions(false, 'race', [])).toEqual(['quali']);
  });

  it('allows race once quali is published on a regular weekend', () => {
    expect(getMissingEarlierSessions(false, 'race', ['quali'])).toEqual([]);
  });

  it('never blocks the first session of the weekend', () => {
    expect(getMissingEarlierSessions(false, 'quali', [])).toEqual([]);
    expect(getMissingEarlierSessions(true, 'sprint_quali', [])).toEqual([]);
  });

  it('lists every missing earlier session on a sprint weekend', () => {
    expect(getMissingEarlierSessions(true, 'race', [])).toEqual([
      'sprint_quali',
      'sprint',
      'quali',
    ]);
    expect(getMissingEarlierSessions(true, 'race', ['sprint_quali'])).toEqual([
      'sprint',
      'quali',
    ]);
    expect(getMissingEarlierSessions(true, 'quali', ['sprint_quali'])).toEqual([
      'sprint',
    ]);
  });

  it('returns nothing for sessions outside the weekend order', () => {
    // Sprint sessions don't exist on a regular weekend; validity of the
    // session itself is checked separately.
    expect(getMissingEarlierSessions(false, 'sprint', [])).toEqual([]);
  });
});
