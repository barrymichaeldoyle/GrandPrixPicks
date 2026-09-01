import { describe, expect, it } from 'vitest';

import {
  MONZA_SETTLED_WEATHER_SUMMARY,
  MONZA_TYRE_HEAT_SENTENCE,
} from './italy2026MonzaWriteupCopy';

describe('italy2026MonzaWriteupCopy', () => {
  it('states the settled weather summary without a misleading overnight range', () => {
    expect(MONZA_SETTLED_WEATHER_SUMMARY).toBe(
      'Dry across every session in the current model. Session highs are in the low-to-mid 30s, around 34°C for the race.',
    );
    expect(MONZA_SETTLED_WEATHER_SUMMARY).not.toContain('22');
  });

  it('names the race temperature and keeps the one-stop question open', () => {
    expect(MONZA_TYRE_HEAT_SENTENCE).toBe(
      'Heat is the usual reason that fails. The current model has the race around 34°C at lights out. Wear is still low at Monza, so it may stay a one-stop.',
    );
    expect(MONZA_TYRE_HEAT_SENTENCE).not.toContain(
      'hot, dry weekend is forecast',
    );
  });
});
