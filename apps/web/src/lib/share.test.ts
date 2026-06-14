import { describe, expect, it } from 'vitest';

import {
  buildH2HPicksShareText,
  buildH2HScoreShareText,
  buildOfficialH2HResultReplyText,
  buildPicksShareText,
  buildRaceResultShareText,
  buildScoreShareText,
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

describe('buildPicksShareText', () => {
  it('formats the viewer’s own top 5 with flags and a challenge', () => {
    expect(
      buildPicksShareText({
        raceName: 'Barcelona Grand Prix',
        sessionLabel: 'Qualifying',
        accountHandle: '@GrandPrixPicks',
        raceHashtag: '#SpanishGP',
        picks: [
          { code: 'VER', nationality: 'NL' },
          { code: 'NOR', nationality: 'GB' },
          { code: 'PIA', nationality: 'AU' },
          { code: 'LEC', nationality: 'MC' },
          { code: 'RUS', nationality: 'GB' },
        ],
      }),
    ).toBe(
      'My Qualifying top 5 for the Barcelona Grand Prix 🎯🏎️\n\nP1 🇳🇱 VER\nP2 🇬🇧 NOR\nP3 🇦🇺 PIA\nP4 🇲🇨 LEC\nP5 🇬🇧 RUS\n\nThink you can beat me on @GrandPrixPicks?\n\n#F1 #SpanishGP',
    );
  });
});

describe('buildScoreShareText', () => {
  it('uses the final-tally copy once every session is scored', () => {
    expect(
      buildScoreShareText({
        raceName: 'Barcelona Grand Prix',
        points: 42,
        isFinal: true,
        accountHandle: '@GrandPrixPicks',
        raceHashtag: '#SpanishGP',
      }),
    ).toBe(
      'I scored 42 points at the Barcelona Grand Prix 🏆\n\nThink you can beat me next round on @GrandPrixPicks?\n\n#F1 #SpanishGP',
    );
  });

  it('uses the running-total copy while results are still coming in', () => {
    expect(
      buildScoreShareText({
        raceName: 'Barcelona Grand Prix',
        points: 18,
        isFinal: false,
        accountHandle: '@GrandPrixPicks',
        raceHashtag: '#SpanishGP',
      }),
    ).toBe(
      '18 points so far at the Barcelona Grand Prix 📈\n\nFollow the results on @GrandPrixPicks.\n\n#F1 #SpanishGP',
    );
  });
});

describe('H2H share text', () => {
  it('formats a player picks post', () => {
    expect(
      buildH2HPicksShareText({
        raceName: 'Barcelona Grand Prix',
        sessionLabel: 'Qualifying',
        winnerCodes: ['NOR', 'LEC', 'VER'],
        accountHandle: '@GrandPrixPicks',
        raceHashtag: '#SpanishGP',
      }),
    ).toBe(
      'My Qualifying Head-to-Head picks for the Barcelona Grand Prix ⚔️🏎️💨\n\nNOR · LEC · VER\n\n🏁 Think you can beat me on @GrandPrixPicks?\n\n#F1 #SpanishGP',
    );
  });

  it('formats a player score post with a one-line verdict strip', () => {
    expect(
      buildH2HScoreShareText({
        raceName: 'Barcelona Grand Prix',
        sessionLabel: 'Qualifying',
        correct: 2,
        total: 3,
        picks: [
          { code: 'NOR', correct: true },
          { code: 'LEC', correct: true },
          { code: null, correct: false },
        ],
        accountHandle: '@GrandPrixPicks',
        raceHashtag: '#SpanishGP',
      }),
    ).toBe(
      'I scored 2/3 on my Barcelona Grand Prix Qualifying Head-to-Head picks ⚔️\n\n✅NOR ✅LEC ❌—\n\nCan you beat my score on @GrandPrixPicks?\n\n#F1 #SpanishGP',
    );
  });

  it('formats an official results reply with driver codes', () => {
    expect(
      buildOfficialH2HResultReplyText({
        raceName: 'Barcelona Grand Prix',
        sessionLabel: 'Qualifying',
        matchups: [
          {
            team: 'McLaren',
            winnerCode: 'NOR',
            loserCode: 'PIA',
          },
          {
            team: 'Ferrari',
            winnerCode: 'LEC',
            loserCode: 'HAM',
          },
          {
            team: 'Red Bull Racing',
            winnerCode: 'VER',
            loserCode: 'TSU',
          },
        ],
        raceHashtag: '#SpanishGP',
      }),
    ).toBe(
      'Barcelona Grand Prix Qualifying Head-to-Head results ⚔️🏁\n\nMcLaren: NOR beat PIA\nFerrari: LEC beat HAM\nRed Bull Racing: VER beat TSU\n\n#F1 #SpanishGP',
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
