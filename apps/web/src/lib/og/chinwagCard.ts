import type { ReactNode } from 'react';
import { createElement } from 'react';

const e = createElement;

/**
 * The link preview for the creator-poll POC (`docs/creator-poll-poc.md`).
 *
 * Deliberately not `brandCardFrame`. When Tommo posts the poll to 341k YouTube
 * subscribers, the card under his tweet is the first thing any of them see, and
 * a Grand Prix Picks card there reads as him having posted the wrong link. So
 * this is his palette, sampled from his own form, with our name confined to the
 * same one credit line the page carries.
 *
 * No brand mark, no wordmark, no chartreuse. That restraint is the point.
 */
const CHINWAG = {
  page: '#fdeded',
  card: '#ffffff',
  coral: '#f78786',
  ink: '#303030',
  inkMuted: '#6d6060',
} as const;

export type ChinwagCardData = {
  /** `pre` asks who will; `post` asks who did. */
  phase: 'pre' | 'post';
  raceName: string;
  round: number;
  /** Omitted before anyone has voted: "0 votes" is an anti-invitation. */
  votes: number | null;
};

export function chinwagCardTemplate(data: ChinwagCardData): ReactNode {
  const heading =
    data.phase === 'post' ? 'BANGERS & CLANGERS' : 'YOUR RACE PREDICTIONS';
  const subheading =
    data.phase === 'post'
      ? 'Who was the banger? Who dropped the clanger?'
      : 'Pole, winner, bangers and clangers. No sign-in.';

  return e(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        backgroundColor: CHINWAG.page,
        fontFamily: 'Archivo',
      },
    },
    // The coral band, standing in for the duotone banner on his own form.
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: CHINWAG.coral,
          padding: '48px 60px',
        },
      },
      e(
        'div',
        {
          style: {
            fontSize: 68,
            fontWeight: 600,
            letterSpacing: 2,
            color: CHINWAG.ink,
            textAlign: 'center' as const,
          },
        },
        heading,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          flex: 1,
          justifyContent: 'center',
          padding: '0 60px',
        },
      },
      e(
        'div',
        { style: { fontSize: 52, fontWeight: 600, color: CHINWAG.ink } },
        `${data.raceName}`,
      ),
      e(
        'div',
        { style: { fontSize: 30, color: CHINWAG.inkMuted, marginTop: 12 } },
        `Round ${data.round} · ${subheading}`,
      ),
      data.votes && data.votes > 0
        ? e(
            'div',
            {
              style: {
                display: 'flex',
                // Satori stretches a flex child by default; without this the
                // pill runs the full width of the card and stops reading as a
                // chip.
                alignSelf: 'flex-start' as const,
                marginTop: 28,
                backgroundColor: CHINWAG.card,
                color: CHINWAG.ink,
                fontSize: 30,
                padding: '12px 22px',
                borderRadius: 6,
              },
            },
            `${data.votes} votes so far`,
          )
        : null,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '0 60px 40px',
          fontSize: 22,
          color: CHINWAG.inkMuted,
        },
      },
      'Built by Grand Prix Picks',
    ),
  );
}
