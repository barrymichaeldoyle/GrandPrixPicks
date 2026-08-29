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
 * scrolled past, it has no headline attached, and Instagram will crop anything
 * that is not close to square. So these are composed for their own frames
 * rather than being an OG card in a different box.
 *
 * Same tokens, wordmark and type as everything else, so a post still reads as
 * the site: flat ground, mono for figures, team colour confined to 3px, and
 * chartreuse only in the brand mark.
 */

const e = createElement;

export type SocialCardSize = 'square' | 'wide';

/**
 * `square` is the Instagram feed post. `wide` is 16:9 for X, which crops
 * in-timeline to roughly 2:1 and opens to the full frame, so nothing
 * load-bearing goes near the top or bottom edge.
 */
const SIZES = {
  square: {
    width: 1080,
    height: 1080,
    pad: 80,
    headline: 82,
    standfirst: 30,
    factLabel: 17,
    factValue: 32,
    factsGap: 44,
    // Constrains where the headline breaks rather than how wide it may be.
    // Left to the full frame, the wide card orphaned "2030" on its own line.
    headlineWidth: 880,
    standfirstWidth: 880,
  },
  wide: {
    width: 1600,
    height: 900,
    pad: 96,
    headline: 96,
    standfirst: 34,
    factLabel: 19,
    factValue: 38,
    factsGap: 72,
    headlineWidth: 1150,
    standfirstWidth: 1120,
  },
} satisfies Record<SocialCardSize, Record<string, unknown>>;

export function getSocialCardDimensions(size: SocialCardSize): {
  width: number;
  height: number;
} {
  const { width, height } = SIZES[size];
  return { width, height };
}

export interface SocialNewsCard {
  /** Small uppercase label, e.g. "Contract news". */
  eyebrow: string;
  /** The story in one line. Written short: this is set very large. */
  headline: string;
  /** One or two sentences under the headline. */
  standfirst: string;
  /** Optional driver code + team colour, shown as the system's 3px chip. */
  driver?: { code: string; color: string };
  /** Up to three label/value pairs. Values are set in mono. */
  facts: { label: string; value: string }[];
}

function factBlock(
  fact: { label: string; value: string },
  s: (typeof SIZES)[SocialCardSize],
): ReactNode {
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
          textTransform: 'uppercase' as const,
          letterSpacing: 2.6,
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
          fontFamily: 'IBM Plex Mono',
          marginTop: 10,
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
  const accentColor = data.driver?.color ?? colors.accent;

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
    // Wordmark, top left.
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 14 } },
      brandMark(30),
      e(
        'div',
        {
          style: {
            fontSize: 21,
            fontWeight: 600,
            letterSpacing: 3.4,
            color: colors.text,
          },
        },
        'GRAND PRIX PICKS',
      ),
    ),
    // Body, centred in whatever height is left. `justifyContent: center` is
    // what lets one composition sit correctly in both a square and a 16:9
    // frame without a second set of vertical offsets.
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
      e(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 20 } },
        // The 3px rule gives the eyebrow a leading edge. It is suppressed when
        // a driver chip follows, because the chip already carries the team
        // colour in its own 3px bar and two of them a few pixels apart read as
        // a rendering mistake rather than a motif.
        data.driver
          ? null
          : e('div', {
              style: { width: 3, height: 30, backgroundColor: accentColor },
            }),
        e(
          'div',
          {
            style: {
              fontSize: s.factLabel + 5,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: 3,
              color: colors.textMuted,
            },
          },
          data.eyebrow,
        ),
        data.driver
          ? e(
              'div',
              {
                style: {
                  display: 'flex',
                  height: 42,
                  borderRadius: 2,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                },
              },
              e('div', {
                style: { width: 3, backgroundColor: data.driver.color },
              }),
              e(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 18px',
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: 1.5,
                  },
                },
                data.driver.code,
              ),
            )
          : null,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: s.headline,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.04,
            marginTop: 34,
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
            marginTop: 30,
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
            gap: s.factsGap,
            marginTop: 52,
          },
        },
        ...data.facts.slice(0, 3).map((fact) => factBlock(fact, s)),
      ),
    ),
    // Footer: the system's one hairline, then the domain.
    e('div', {
      style: { height: 1, backgroundColor: colors.border, marginBottom: 24 },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 22,
          fontFamily: 'IBM Plex Mono',
          color: colors.textMuted,
        },
      },
      'grandprixpicks.com',
    ),
  );
}
