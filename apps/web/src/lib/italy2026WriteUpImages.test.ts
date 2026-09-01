import { describe, expect, it } from 'vitest';

import { SCHUMACHER_TRIBUTE_WRITEUP_IMAGE } from './italy2026WriteUpImages';

describe('SCHUMACHER_TRIBUTE_WRITEUP_IMAGE', () => {
  it('keeps honest Indianapolis attribution and hosted asset path', () => {
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.src).toBe(
      '/media/rick-dikeman-schumacher-ferrari-indianapolis-2002.jpg',
    );
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.alt).toBe(
      'Michael Schumacher in Ferrari overalls, Indianapolis 2002',
    );
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.creditName).toBe('Rick Dikeman');
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.licenseName).toBe('CC BY-SA 3.0');
  });
});
