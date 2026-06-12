import { describe, expect, it } from 'vitest';

import {
  buildH2HScoreShareText,
  buildOfficialH2HResultShareText,
  buildRaceResultShareText,
  buildXShareIntentUrl,
  countryCodeToFlagEmoji,
} from './share';

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

describe('buildRaceResultShareText', () => {
  it('formats official results with flags and the seeded race hashtag', () => {
    expect(
      buildRaceResultShareText({
        raceName: 'Barcelona Grand Prix',
        sessionLabel: 'Qualifying',
        accountHandle: '@GrandPrixPicks',
        raceHashtag: '#SpanishGP',
        drivers: [
          { code: 'VER', nationality: 'NL' },
          { code: 'NOR', nationality: 'GB' },
          { code: 'PIA', nationality: 'AU' },
          { code: 'LEC', nationality: 'MC' },
          { code: 'RUS', nationality: 'GB' },
        ],
      }),
    ).toBe(
      'Barcelona Grand Prix Qualifying results 🏎️🏁\n\nP1 🇳🇱 VER\nP2 🇬🇧 NOR\nP3 🇦🇺 PIA\nP4 🇲🇨 LEC\nP5 🇬🇧 RUS\n\nFull results and player scores on @GrandPrixPicks.\n\n#F1 #SpanishGP',
    );
  });
});

describe('H2H share text', () => {
  it('formats a player score post', () => {
    expect(
      buildH2HScoreShareText({
        raceName: 'Barcelona Grand Prix',
        sessionLabel: 'Qualifying',
        correct: 7,
        total: 11,
        accountHandle: '@GrandPrixPicks',
        raceHashtag: '#SpanishGP',
      }),
    ).toBe(
      'I got 7/11 Head-to-Head picks right for the Barcelona Grand Prix Qualifying 🏎️🏁\n\nCan you beat my score on @GrandPrixPicks?\n\n#F1 #SpanishGP',
    );
  });

  it('formats an official results post', () => {
    expect(
      buildOfficialH2HResultShareText({
        raceName: 'Barcelona Grand Prix',
        sessionLabel: 'Qualifying',
        winnerCodes: ['NOR', 'LEC', 'VER'],
        accountHandle: '@GrandPrixPicks',
        raceHashtag: '#SpanishGP',
      }),
    ).toBe(
      'Barcelona Grand Prix Qualifying Head-to-Head results 🏎️🏁\n\nWinners: NOR · LEC · VER\n\nSee every teammate matchup on @GrandPrixPicks.\n\n#F1 #SpanishGP',
    );
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
