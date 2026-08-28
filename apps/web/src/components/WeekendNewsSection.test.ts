import { describe, expect, it } from 'vitest';

import { pickImpactSessions } from './WeekendNewsSection';

describe('pickImpactSessions', () => {
  it('says nothing when an item touches the whole weekend', () => {
    // The Monza case. Both published items affected both sessions, so both
    // cards rendered the same highlighted line and neither told the reader
    // anything the other did not.
    expect(pickImpactSessions(['quali', 'race'], ['quali', 'race'])).toBeNull();
  });

  it('names both sides when it narrows the weekend down', () => {
    expect(pickImpactSessions(['race'], ['quali', 'race'])).toEqual({
      affected: ['race'],
      unaffected: ['quali'],
    });
  });

  it('still narrows on a sprint weekend', () => {
    expect(
      pickImpactSessions(
        ['sprint', 'race'],
        ['sprint_quali', 'sprint', 'quali', 'race'],
      ),
    ).toEqual({
      affected: ['sprint', 'race'],
      unaffected: ['sprint_quali', 'quali'],
    });
  });

  it('is not fooled by an item naming a session the weekend does not run', () => {
    // Publishing validates this, but the component must not conclude "affects
    // everything" from a list that happens to be longer than the weekend.
    expect(pickImpactSessions(['sprint', 'race'], ['quali', 'race'])).toEqual({
      affected: ['sprint', 'race'],
      unaffected: ['quali'],
    });
  });
});
