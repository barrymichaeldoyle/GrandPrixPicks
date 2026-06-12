import { describe, expect, it } from 'vitest';

import { buildXShareIntentUrl, countryCodeToFlagEmoji } from './share';

describe('countryCodeToFlagEmoji', () => {
  it('converts ISO alpha-2 codes to flag emoji', () => {
    expect(countryCodeToFlagEmoji('NL')).toBe('🇳🇱');
    expect(countryCodeToFlagEmoji(' gb ')).toBe('🇬🇧');
  });

  it('returns an empty string for missing or invalid codes', () => {
    expect(countryCodeToFlagEmoji()).toBe('');
    expect(countryCodeToFlagEmoji('GBR')).toBe('');
    expect(countryCodeToFlagEmoji('1A')).toBe('');
  });
});

describe('buildXShareIntentUrl', () => {
  it('places the shared URL after a blank line', () => {
    const intent = new URL(
      buildXShareIntentUrl(
        'My Race top 5:\n\nVER · NOR · PIA · LEC · RUS',
        'https://grandprixpicks.com/races/test?share=picks&utm_source=x',
      ),
    );

    expect(intent.origin + intent.pathname).toBe('https://x.com/intent/post');
    expect(intent.searchParams.get('text')).toBe(
      'My Race top 5:\n\nVER · NOR · PIA · LEC · RUS\n\nhttps://grandprixpicks.com/races/test?share=picks&utm_source=x',
    );
    expect(intent.searchParams.has('url')).toBe(false);
  });

  it('trims accidental whitespace around the post copy', () => {
    const intent = new URL(
      buildXShareIntentUrl(
        '  Join my league. \n',
        'https://grandprixpicks.com/leagues/test',
      ),
    );

    expect(intent.searchParams.get('text')).toBe(
      'Join my league.\n\nhttps://grandprixpicks.com/leagues/test',
    );
  });
});
