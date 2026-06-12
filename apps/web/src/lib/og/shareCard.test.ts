import { describe, expect, it } from 'vitest';

import type { ShareCard } from './shareCard';
import { encodeShareCardSearch, parseShareCard } from './shareCard';

describe('share card codec', () => {
  it('round-trips a picks card', () => {
    const card: ShareCard = {
      variant: 'picks',
      session: 'race',
      picks: ['VER', 'NOR', 'LEC', 'PIA', 'HAM'],
      by: 'Barry',
    };
    const encoded = encodeShareCardSearch(card);
    expect(encoded).toEqual({
      share: 'picks',
      session: 'race',
      picks: 'VER,NOR,LEC,PIA,HAM',
      by: 'Barry',
    });
    expect(parseShareCard(encoded)).toEqual(card);
  });

  it('round-trips a score card', () => {
    const card: ShareCard = { variant: 'score', points: 38, final: true };
    const encoded = encodeShareCardSearch(card);
    expect(encoded).toEqual({ share: 'score', points: '38', final: '1' });
    expect(parseShareCard(encoded)).toEqual({ ...card, by: undefined });
  });

  it('round-trips a result card', () => {
    const card: ShareCard = {
      variant: 'result',
      session: 'quali',
      picks: ['VER', 'NOR', 'PIA', 'LEC', 'RUS'],
    };
    const encoded = encodeShareCardSearch(card);
    expect(encoded).toEqual({
      share: 'result',
      session: 'quali',
      picks: 'VER,NOR,PIA,LEC,RUS',
    });
    expect(parseShareCard(encoded)).toEqual(card);
  });

  it('round-trips H2H cards', () => {
    const resultCard: ShareCard = {
      variant: 'h2h_result',
      session: 'race',
      winners: ['NOR', 'LEC', 'VER'],
    };
    expect(parseShareCard(encodeShareCardSearch(resultCard))).toEqual(
      resultCard,
    );

    const picksCard: ShareCard = {
      variant: 'h2h_picks',
      session: 'sprint',
      winners: ['NOR', 'LEC', 'VER', 'ALO'],
      by: 'Barry',
    };
    const encodedPicks = encodeShareCardSearch(picksCard);
    expect(encodedPicks).toEqual({
      share: 'h2h_picks',
      session: 'sprint',
      winners: 'NOR,LEC,VER,ALO',
      by: 'Barry',
    });
    expect(parseShareCard(encodedPicks)).toEqual(picksCard);

    const scoreCard: ShareCard = {
      variant: 'h2h_score',
      session: 'quali',
      correct: 7,
      total: 11,
      points: 7,
      by: 'Barry',
    };
    expect(parseShareCard(encodeShareCardSearch(scoreCard))).toEqual(scoreCard);

    const scoreCardWithPicks: ShareCard = {
      variant: 'h2h_score',
      session: 'quali',
      correct: 2,
      total: 3,
      points: 2,
      picks: [
        { code: 'NOR', correct: true },
        { code: 'LEC', correct: true },
        { code: 'VER', correct: false },
      ],
      by: 'Barry',
    };
    const encodedScore = encodeShareCardSearch(scoreCardWithPicks);
    expect(encodedScore.picks).toBe('NOR:1,LEC:1,VER:0');
    expect(parseShareCard(encodedScore)).toEqual(scoreCardWithPicks);
  });

  it('returns null when share param is absent', () => {
    expect(parseShareCard({})).toBeNull();
    expect(parseShareCard({ session: 'race' })).toBeNull();
  });

  it('rejects invalid driver codes and wrong pick counts', () => {
    expect(
      parseShareCard({ share: 'picks', session: 'race', picks: 'VER,NOR' }),
    ).toBeNull();
    expect(
      parseShareCard({
        share: 'picks',
        session: 'race',
        picks: 'VER,NOR,LEC,PIA,h4m',
      }),
    ).toBeNull();
    expect(
      parseShareCard({
        share: 'picks',
        session: 'race',
        picks: 'VER,NOR,LEC,PIA,<script>',
      }),
    ).toBeNull();
    expect(
      parseShareCard({
        share: 'result',
        session: 'race',
        picks: 'VER,NOR',
      }),
    ).toBeNull();
  });

  it('rejects invalid sessions and points', () => {
    expect(
      parseShareCard({
        share: 'picks',
        session: 'fp1',
        picks: 'VER,NOR,LEC,PIA,HAM',
      }),
    ).toBeNull();
    expect(parseShareCard({ share: 'score', points: '-1' })).toBeNull();
    expect(parseShareCard({ share: 'score', points: '1000' })).toBeNull();
    expect(parseShareCard({ share: 'score', points: '12.5' })).toBeNull();
    expect(parseShareCard({ share: 'score', points: 'abc' })).toBeNull();
    expect(
      parseShareCard({
        share: 'h2h_score',
        session: 'race',
        correct: '12',
        total: '11',
        points: '12',
      }),
    ).toBeNull();
    expect(
      parseShareCard({
        share: 'h2h_result',
        session: 'race',
        winners: 'NOR,bad',
      }),
    ).toBeNull();
    expect(
      parseShareCard({
        share: 'h2h_picks',
        session: 'race',
        winners: '',
      }),
    ).toBeNull();
    expect(
      parseShareCard({
        share: 'h2h_score',
        session: 'race',
        correct: '2',
        total: '3',
        points: '2',
        picks: 'NOR:1,bad',
      }),
    ).toBeNull();
  });

  it('sanitizes the by name', () => {
    const parsed = parseShareCard({
      share: 'score',
      points: '10',
      final: '0',
      by: '  Barry\n\u0000Doyle  ',
    });
    expect(parsed).toEqual({
      variant: 'score',
      points: 10,
      final: false,
      by: 'BarryDoyle',
    });

    const longName = 'x'.repeat(100);
    const parsedLong = parseShareCard({
      share: 'score',
      points: '10',
      by: longName,
    });
    expect(parsedLong?.variant).toBe('score');
    if (parsedLong?.variant === 'score') {
      expect(parsedLong.by).toHaveLength(40);
    }
  });
});
