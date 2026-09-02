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
    headline: 88,
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
  /** Up to four label/value pairs. Values are set in mono. */
  facts: { label: string; value: string }[];
  /**
   * An optional span-of-years bar. When present it replaces the stacked facts
   * as the card's main block and the facts drop to a compact row beneath it.
   *
   * Use it when the story *is* a duration. A contract card is three dates and
   * a headline; drawn as a bar, the length of the commitment is the thing you
   * see before reading a word, which is the whole point of the news.
   */
  timeline?: {
    /** First and last labelled year of the axis. */
    from: number;
    to: number;
    /** Where the solid run ends. Anything past it renders as the option tail. */
    solidTo: number;
    /** Team colour for the filled run. */
    color: string;
    marks: { year: number; label: string }[];
    tailLabel?: string;
  };
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

function factBlock(
  fact: { label: string; value: string },
  s: Size,
  compact = false,
  dense = false,
): ReactNode {
  return e(
    'div',
    {
      key: fact.label,
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        ...(dense ? { flexBasis: 0, flexGrow: 1, minWidth: 0 } : {}),
      },
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
          fontSize: compact
            ? s.factValue * 0.62
            : dense
              ? s.factValue * 0.78
              : s.factValue,
          fontWeight: 600,
          marginTop: 8,
        },
      },
      fact.value,
    ),
  );
}

/**
 * The span-of-years bar.
 *
 * Laid out with percentage offsets against the axis rather than flex, because
 * the marks have to line up with real years: a mark at 2026 sits where 2026
 * actually falls, not wherever a flex row happens to put it. Satori supports
 * percentage `left` on an absolutely positioned child, which is the only piece
 * of arithmetic this needs.
 *
 * The tail past `solidTo` is the same colour at low opacity: an option that has
 * not been taken up should read as lighter than a signed commitment, and a
 * second hue would put a fourth colour on a card that allows two.
 */
function timelineBar(
  timeline: NonNullable<SocialNewsCard['timeline']>,
  s: Size,
): ReactNode {
  const span = timeline.to - timeline.from;
  const railHeight = s.factsColumn ? 18 : 15;

  /** A year's position along the axis, as a percentage of its full width. */
  function pct(year: number): number {
    return ((year - timeline.from) / span) * 100;
  }

  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        marginTop: s.factsColumn ? 56 : 44,
      },
    },
    // Rail: unfilled ground, solid run, then the option tail.
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'relative' as const,
          width: '100%',
          height: railHeight,
          backgroundColor: colors.surfaceElevated,
        },
      },
      e('div', {
        style: {
          position: 'absolute' as const,
          left: 0,
          top: 0,
          width: `${pct(timeline.solidTo)}%`,
          height: railHeight,
          backgroundColor: timeline.color,
        },
      }),
      e('div', {
        style: {
          position: 'absolute' as const,
          left: `${pct(timeline.solidTo)}%`,
          top: 0,
          width: `${100 - pct(timeline.solidTo)}%`,
          height: railHeight,
          backgroundColor: timeline.color,
          opacity: 0.32,
        },
      }),
    ),
    // Marks: a 3px tick at the real year, its figure in mono, its label under.
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'relative' as const,
          width: '100%',
          height: s.factsColumn ? 122 : 104,
        },
      },
      ...timeline.marks.map((mark) =>
        e(
          'div',
          {
            key: mark.label,
            style: {
              display: 'flex',
              flexDirection: 'column' as const,
              position: 'absolute' as const,
              left: `${pct(mark.year)}%`,
              top: 0,
              // The last mark would otherwise run off the right edge.
              transform:
                pct(mark.year) > 85 ? 'translateX(-100%)' : 'translateX(0)',
              alignItems: pct(mark.year) > 85 ? 'flex-end' : 'flex-start',
            },
          },
          e('div', {
            style: {
              width: 3,
              height: 14,
              backgroundColor: colors.borderStrong,
            },
          }),
          e(
            'div',
            {
              style: {
                fontSize: s.factsColumn ? 38 : 33,
                fontWeight: 600,
                fontFamily: 'IBM Plex Mono',
                marginTop: 12,
              },
            },
            String(mark.year),
          ),
          e(
            'div',
            {
              style: {
                fontSize: s.factLabel - 2,
                fontWeight: 600,
                fontFamily: 'IBM Plex Mono',
                textTransform: 'uppercase' as const,
                letterSpacing: 2,
                color: colors.textMuted,
                marginTop: 6,
              },
            },
            mark.label,
          ),
        ),
      ),
    ),
  );
}

export function socialNewsCard(
  data: SocialNewsCard,
  size: SocialCardSize,
): ReactNode {
  const s = SIZES[size];
  const denseFacts = !s.factsColumn && data.facts.length === 4;

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
      data.timeline ? timelineBar(data.timeline, s) : null,
      // The facts row is dropped from the wide card whenever a timeline is
      // shown. 900px does not hold a top strip, kicker, two-line headline,
      // two-line standfirst, an axis AND a facts row: the block overflowed and
      // shunted the kicker into the strip above it. The portrait frame has the
      // room, and on X the same facts are in the post copy anyway.
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection:
              data.timeline || !s.factsColumn
                ? ('row' as const)
                : ('column' as const),
            gap: data.timeline ? 56 : denseFacts ? 44 : s.factsGap,
            marginTop: data.timeline ? 44 : s.factsColumn ? 56 : 48,
          },
        },
        ...(data.timeline && !s.factsColumn
          ? []
          : data.facts
              .slice(0, 4)
              .map((fact) => factBlock(fact, s, !!data.timeline, denseFacts))),
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
