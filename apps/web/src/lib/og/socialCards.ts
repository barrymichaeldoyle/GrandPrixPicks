import type { ReactNode } from 'react';
import { createElement } from 'react';

import { colors } from './styles';
import { brandMark } from './templates';

/**
 * Branded cards for posting *as* Grand Prix Picks, as opposed to the OG cards
 * that sit under a link.
 *
 * The distinction is not cosmetic. An OG card is 1200x630 because that is the
 * shape a scraper crops to, and it is only ever seen small, under a headline
 * the platform supplies. A social post is the content: it is the thing being
 * scrolled past, it has no headline attached, and Instagram crops anything
 * taller than 4:5.
 *
 * The composition follows the Dutch GP community-picks card, which is the
 * house pattern for a campaign carried by facts rather than artwork: a mono
 * top strip with the section name in accent, a kicker, a heavy headline, the
 * content block filling the middle, and a hairline over a call to action whose
 * domain is the accent. The Monza roundup slides differ because they compose
 * over hand-made collage art; without art, that layout leaves the bottom
 * two-thirds of a portrait frame empty.
 */

const e = createElement;

export type SocialCardSize = 'instagram' | 'x';

/**
 * The house sizes, matching every campaign in `artifacts/social/`: 1080x1350
 * for Instagram and 1600x900 for X.
 *
 * `footerAlign` exists because of a lesson recorded in the Dutch GP campaign:
 * X draws its own ALT badge over the lower-left corner of an image, so a
 * footer parked there gets covered. On X the call to action is right-aligned;
 * on Instagram, which has no such overlay, it stays left with everything else.
 *
 * The facts stack in portrait and run in a row on the wide card. That is what
 * fills the middle of a 4:5 frame — three columns across 1080px leaves the
 * bottom half of the card empty, which is exactly how this looked before.
 */
const SIZES = {
  instagram: {
    width: 1080,
    height: 1350,
    pad: 64,
    headline: 80,
    standfirst: 30,
    factLabel: 19,
    factValue: 46,
    factsColumn: true,
    factsGap: 34,
    // Constrains where the headline breaks rather than how wide it may be.
    // Left to the full frame, the X card orphaned "2030" on its own line.
    headlineWidth: 900,
    standfirstWidth: 880,
    footerAlign: 'flex-start' as const,
  },
  x: {
    width: 1600,
    height: 900,
    pad: 88,
    headline: 92,
    standfirst: 33,
    factLabel: 19,
    factValue: 40,
    factsColumn: false,
    factsGap: 72,
    headlineWidth: 1120,
    standfirstWidth: 1100,
    footerAlign: 'flex-end' as const,
  },
} satisfies Record<SocialCardSize, Record<string, unknown>>;

type Size = (typeof SIZES)[SocialCardSize];

export function getSocialCardDimensions(size: SocialCardSize): {
  width: number;
  height: number;
} {
  const { width, height } = SIZES[size];
  return { width, height };
}

export interface SocialNewsCard {
  /** Section name for the top strip, e.g. "Contract news". Set in accent. */
  eyebrow: string;
  /** The story in one line. Written short: this is set very large. */
  headline: string;
  /** One or two sentences under the headline. */
  standfirst: string;
  /** Optional driver code + team colour, shown as the system's 3px chip. */
  driver?: { code: string; color: string };
  /** Optional kicker beside the chip, e.g. the team name. */
  kicker?: string;
  /** Up to three label/value pairs. Values are set in mono. */
  facts: { label: string; value: string }[];
}

function topStrip(eyebrow: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 21,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          letterSpacing: 2.4,
          textTransform: 'uppercase' as const,
          color: colors.textMuted,
        },
      },
      e('div', {}, 'GRAND PRIX PICKS /'),
      e('div', { style: { color: colors.accent, marginLeft: 10 } }, eyebrow),
    ),
    brandMark(34),
  );
}

function driverKicker(
  driver: { code: string; color: string } | undefined,
  kicker: string | undefined,
): ReactNode {
  if (!driver && !kicker) {
    return null;
  }
  return e(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 16 } },
    driver
      ? e(
          'div',
          {
            style: {
              display: 'flex',
              height: 44,
              borderRadius: 2,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            },
          },
          e('div', { style: { width: 3, backgroundColor: driver.color } }),
          e(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                fontSize: 23,
                fontWeight: 600,
                letterSpacing: 1.5,
              },
            },
            driver.code,
          ),
        )
      : null,
    kicker
      ? e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 25,
              fontFamily: 'IBM Plex Mono',
              color: colors.textMuted,
            },
          },
          kicker,
        )
      : null,
  );
}

function factBlock(fact: { label: string; value: string }, s: Size): ReactNode {
  return e(
    'div',
    {
      key: fact.label,
      style: { display: 'flex', flexDirection: 'column' as const },
    },
    e(
      'div',
      {
        style: {
          fontSize: s.factLabel,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          textTransform: 'uppercase' as const,
          letterSpacing: 2.2,
          color: colors.textMuted,
        },
      },
      fact.label,
    ),
    e(
      'div',
      {
        style: {
          fontSize: s.factValue,
          fontWeight: 600,
          marginTop: 8,
        },
      },
      fact.value,
    ),
  );
}

export function socialNewsCard(
  data: SocialNewsCard,
  size: SocialCardSize,
): ReactNode {
  const s = SIZES[size];

  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        width: s.width,
        height: s.height,
        backgroundColor: colors.bg,
        fontFamily: 'Archivo',
        color: colors.text,
        padding: s.pad,
      },
    },
    topStrip(data.eyebrow),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          flex: 1,
          justifyContent: 'center',
        },
      },
      driverKicker(data.driver, data.kicker),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: s.headline,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.04,
            marginTop: 28,
            maxWidth: s.headlineWidth,
          },
        },
        data.headline,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: s.standfirst,
            lineHeight: 1.42,
            color: colors.textMuted,
            marginTop: 26,
            maxWidth: s.standfirstWidth,
          },
        },
        data.standfirst,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: s.factsColumn
              ? ('column' as const)
              : ('row' as const),
            gap: s.factsGap,
            marginTop: s.factsColumn ? 56 : 48,
          },
        },
        ...data.facts.slice(0, 3).map((fact) => factBlock(fact, s)),
      ),
    ),
    // The system's one hairline, then the call to action. The domain is the
    // accent here rather than the eyebrow's, so each card spends chartreuse
    // twice: once naming the section, once on the thing to go and do.
    e('div', {
      style: { height: 1, backgroundColor: colors.border, marginBottom: 26 },
    }),
    e(
      'div',
      { style: { display: 'flex', justifyContent: s.footerAlign } },
      e(
        'div',
        { style: { display: 'flex', fontSize: 27, fontWeight: 600 } },
        e('div', {}, 'Make your picks at'),
        e(
          'div',
          { style: { color: colors.accent, marginLeft: 10 } },
          'GrandPrixPicks.com',
        ),
      ),
    ),
  );
}
