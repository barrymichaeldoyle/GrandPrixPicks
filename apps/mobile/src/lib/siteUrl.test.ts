import { describe, expect, it } from 'vitest';

import { siteUrl } from './siteUrl';

describe('siteUrl', () => {
  it('marks a site page for the in-app browser', () => {
    expect(siteUrl('/terms')).toBe('https://grandprixpicks.com/terms?app=1');
  });

  it('keeps the fragment after the query', () => {
    expect(siteUrl('/results-policy#sessions-heading')).toBe(
      'https://grandprixpicks.com/results-policy?app=1#sessions-heading',
    );
  });

  it('adds to an existing query', () => {
    expect(siteUrl('/races?round=17')).toBe(
      'https://grandprixpicks.com/races?round=17&app=1',
    );
  });
});
