import { describe, expect, it } from 'vitest';

import { getRaceLocation } from './raceLocations';

describe('getRaceLocation', () => {
  it('resolves a slug to its circuit, ignoring the season suffix', () => {
    expect(getRaceLocation('britain-2026')?.country).toBe('United Kingdom');
    expect(getRaceLocation('abu-dhabi')?.circuit).toBe('Yas Marina Circuit');
  });

  it('lets a full-slug override beat the prefix for a relocated race', () => {
    // The 2026 Bahrain GP keeps its name but is run at Sepang, Malaysia, so
    // the JSON-LD Google reads has to name Malaysia, not Sakhir.
    expect(getRaceLocation('bahrain-2026')).toEqual({
      circuit: 'Sepang International Circuit',
      locality: 'Kuala Lumpur',
      country: 'Malaysia',
    });
    // Every other Bahrain GP is still at Sakhir.
    expect(getRaceLocation('bahrain-2027')?.country).toBe('Bahrain');
  });

  it('returns null for an unknown venue', () => {
    expect(getRaceLocation('made-up-2026')).toBeNull();
  });
});
