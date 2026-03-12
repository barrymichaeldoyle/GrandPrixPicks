import { describe, expect, it } from 'vitest';

import { buildRaceEmailUrl } from './urls';

describe('buildRaceEmailUrl', () => {
  it('uses the race slug in reminder links', () => {
    expect(
      buildRaceEmailUrl({
        appUrl: 'https://grandprixpicks.com',
        raceSlug: 'china-2026',
        campaign: 'prediction_reminder',
      }),
    ).toBe(
      'https://grandprixpicks.com/races/china-2026?utm_source=email&utm_medium=email&utm_campaign=prediction_reminder',
    );
  });
});
