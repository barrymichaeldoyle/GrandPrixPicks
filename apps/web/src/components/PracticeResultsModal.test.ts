import { describe, expect, it } from 'vitest';

import { getVisibleCompetitiveSessions } from './PracticeResultsModal';

describe('practice results modal chronology', () => {
  it('only reveals qualifying before regular-weekend race picks', () => {
    expect(getVisibleCompetitiveSessions('quali', false)).toEqual([]);
    expect(getVisibleCompetitiveSessions('race', false)).toEqual(['quali']);
  });

  it('reveals completed sprint-weekend sessions in chronological order', () => {
    expect(getVisibleCompetitiveSessions('sprint_quali', true)).toEqual([]);
    expect(getVisibleCompetitiveSessions('sprint', true)).toEqual([
      'sprint_quali',
    ]);
    expect(getVisibleCompetitiveSessions('quali', true)).toEqual([
      'sprint_quali',
      'sprint',
    ]);
    expect(getVisibleCompetitiveSessions('race', true)).toEqual([
      'sprint_quali',
      'sprint',
      'quali',
    ]);
  });
});
