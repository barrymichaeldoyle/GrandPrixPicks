import { describe, expect, it } from 'vitest';

import { getCircuit, getCircuitForRace, listCircuits } from './circuits';

describe('getCircuitForRace', () => {
  it('resolves a race slug to its venue, with or without a season suffix', () => {
    expect(getCircuitForRace('britain-2026')?.slug).toBe('silverstone');
    expect(getCircuitForRace('italy')?.slug).toBe('monza');
    expect(getCircuitForRace('BELGIUM-2026')?.slug).toBe('spa');
  });

  it('keeps the two Spanish rounds on different circuits', () => {
    // Both are in Europe/Madrid, which is exactly why keying venue facts off
    // the timezone or the country would not have been enough.
    expect(getCircuitForRace('spain-2026')?.name).toBe(
      'Circuit de Barcelona-Catalunya',
    );
    expect(getCircuitForRace('madrid-2026')?.name).toBe('Madring');
  });

  it('sends a relocated race to the ground it is actually run on', () => {
    // The 2026 Bahrain GP is run at Sepang, in Malaysia.
    const sepang = getCircuitForRace('bahrain-2026');
    expect(sepang?.slug).toBe('sepang');
    expect(sepang?.country).toBe('Malaysia');
    expect(sepang?.timeZone).toBe('Asia/Kuala_Lumpur');
  });

  it('does not let that override leak into any other season', () => {
    for (const slug of ['bahrain', 'bahrain-2025', 'bahrain-2027']) {
      const circuit = getCircuitForRace(slug);
      expect(circuit?.slug, slug).toBe('sakhir');
      expect(circuit?.country, slug).toBe('Bahrain');
    }
  });

  it('returns null for a slug it has never seen', () => {
    // Admins can create a race with any slug, so this has to be survivable.
    expect(getCircuitForRace('made-up-grand-prix-2026')).toBeNull();
  });
});

describe('the circuit table', () => {
  it('keys every circuit by its own slug', () => {
    for (const circuit of listCircuits()) {
      expect(getCircuit(circuit.slug)).toEqual(circuit);
    }
  });

  it('gives every circuit a resolvable IANA timezone', () => {
    for (const circuit of listCircuits()) {
      expect(
        () =>
          new Intl.DateTimeFormat('en', {
            timeZone: circuit.timeZone,
          }).format(0),
        `${circuit.slug} has an invalid timeZone`,
      ).not.toThrow();
    }
  });

  it('has no two circuits sharing a slug or a name', () => {
    const circuits = listCircuits();
    expect(new Set(circuits.map((c) => c.slug)).size).toBe(circuits.length);
    expect(new Set(circuits.map((c) => c.name)).size).toBe(circuits.length);
  });

  it('gives every circuit valid forecast coordinates', () => {
    for (const circuit of listCircuits()) {
      expect(circuit.latitude, circuit.slug).toBeGreaterThanOrEqual(-90);
      expect(circuit.latitude, circuit.slug).toBeLessThanOrEqual(90);
      expect(circuit.longitude, circuit.slug).toBeGreaterThanOrEqual(-180);
      expect(circuit.longitude, circuit.slug).toBeLessThanOrEqual(180);
    }
  });
});
