import { describe, expect, it } from 'vitest';

import { racePageTitle } from './racePageTitle';

describe('racePageTitle', () => {
  it('spells out Grand Prix when the title fits', () => {
    expect(racePageTitle('Australian Grand Prix', 2026, 'Results')).toBe(
      'Australian Grand Prix 2026 Results | Grand Prix Picks',
    );
  });

  it('shortens to GP when the full name would be truncated', () => {
    for (const kind of ['Results', 'Predictions'] as const) {
      const title = racePageTitle('Barcelona-Catalunya Grand Prix', 2026, kind);
      expect(title).toBe(
        `Barcelona-Catalunya GP 2026 ${kind} | Grand Prix Picks`,
      );
      expect(title.length).toBeLessThanOrEqual(60);
    }
  });
});
