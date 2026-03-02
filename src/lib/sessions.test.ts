import { describe, expect, it } from 'vitest';

import { getSessionsForWeekend } from './sessions';

describe('getSessionsForWeekend', () => {
  it('returns sprint session order for sprint weekends', () => {
    expect(getSessionsForWeekend(true)).toEqual([
      'sprint_quali',
      'sprint',
      'quali',
      'race',
    ]);
  });

  it('returns regular session order for non-sprint weekends', () => {
    expect(getSessionsForWeekend(false)).toEqual(['quali', 'race']);
  });
});
