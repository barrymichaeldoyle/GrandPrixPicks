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
    expect(parsedLong?.by).toHaveLength(40);
  });
});
