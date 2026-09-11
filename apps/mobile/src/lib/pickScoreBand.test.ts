import { describe, expect, it } from 'vitest';

import { pickScoreBandClass } from './pickScoreBand';

describe('pickScoreBandClass', () => {
  it('maps scoring bands to the web sector colours', () => {
    expect(pickScoreBandClass(5)).toBe('bg-result-exact');
    expect(pickScoreBandClass(3)).toBe('bg-result-near');
    expect(pickScoreBandClass(1)).toBe('bg-result-top5');
    expect(pickScoreBandClass(0)).toBe('bg-racing-red');
  });

  it('treats an unknown score as a miss', () => {
    expect(pickScoreBandClass(2)).toBe('bg-racing-red');
  });

  it('uses the border token when the session is still live', () => {
    expect(pickScoreBandClass(undefined)).toBe('bg-border');
  });
});
