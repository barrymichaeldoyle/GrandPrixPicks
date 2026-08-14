import { describe, expect, it } from 'vitest';

import { getCircuitGuide } from './circuitGuides';

/**
 * Every slug on the 2026 calendar. A race page with no guide falls back to
 * rendering nothing, which is exactly the thin-content state the guides exist
 * to remove, so a missing entry has to fail loudly here rather than quietly in
 * production.
 */
const CALENDAR_2026 = [
  'australia-2026',
  'china-2026',
  'japan-2026',
  'miami-2026',
  'canada-2026',
  'monaco-2026',
  'spain-2026',
  'austria-2026',
  'britain-2026',
  'belgium-2026',
  'hungary-2026',
  'netherlands-2026',
  'italy-2026',
  'madrid-2026',
  'azerbaijan-2026',
  'bahrain-2026',
  'singapore-2026',
  'usa-2026',
  'mexico-2026',
  'brazil-2026',
  'las-vegas-2026',
  'qatar-2026',
  'abu-dhabi-2026',
];

describe('circuit guides', () => {
  it('covers every race on the calendar', () => {
    const missing = CALENDAR_2026.filter(
      (slug) => getCircuitGuide(slug) === null,
    );
    expect(missing).toEqual([]);
  });

  it('carries enough prose to be worth indexing', () => {
    for (const slug of CALENDAR_2026) {
      const guide = getCircuitGuide(slug);
      expect(guide, slug).not.toBeNull();
      const wordCount = [
        guide!.character,
        guide!.layout,
        guide!.racing,
        guide!.predicting,
      ]
        .join(' ')
        .split(/\s+/).length;
      expect(wordCount, `${slug} is too short`).toBeGreaterThan(150);
      expect(guide!.traits.length, slug).toBe(3);
    }
  });

  it('matches on a slug with or without its season suffix', () => {
    expect(getCircuitGuide('monaco')).toEqual(getCircuitGuide('monaco-2026'));
  });

  it('returns null for a venue with no entry yet', () => {
    expect(getCircuitGuide('not-a-real-circuit-2026')).toBeNull();
  });
});
