import type { ReactNode } from 'react';
import { createElement } from 'react';

import type { OgImageSize } from './styles';
import { colors, getOgDimensions } from './styles';

// Shorthand for React.createElement — satori accepts ReactNode trees.
const e = createElement;

/**
 * The brand mark: three bars descending like a timing tower, sheared -12deg to
 * echo the signature stripe. Mirrors `components/Wordmark.tsx` and
 * `public/favicon.svg`.
 *
 * Satori renders a real SVG subtree, so this is the same artwork the app uses
 * rather than a lookalike — the cards previously drew a Lucide flag, which was
 * never the brand.
 */
export function brandMark(size: number): ReactNode {
  return e(
    'svg',
    { width: size, height: size * (40 / 60), viewBox: '0 0 60 40' },
    e(
      'g',
      {
        fill: colors.accent,
        transform: 'translate(28 20) skewX(-12) translate(-28 -20)',
      },
      e('rect', { x: 7, y: 14, width: 12, height: 24 }),
      e('rect', { x: 24, y: 2, width: 12, height: 36 }),
      e('rect', { x: 41, y: 20, width: 12, height: 18 }),
    ),
  );
}

/**
 * Shared outer wrapper for every card: flat page, content, hairline, footer.
 *
 * The pre-theme version of this opened with a 6px accent *gradient* bar and
 * closed with the wordmark in an accent-tinted chip and the domain set in
 * chartreuse. All three broke a rule of the current system at once (no
 * gradients, accent is rare, nothing is tinted for decoration), and because
 * every share card routes through here, all of them inherited it. The only
 * elevation mechanism now is the 1px hairline above the footer.
 *
 * This also used to support an optional full-bleed background image behind a
 * 42%-opacity veil, used by exactly one card. The asset was a navy-and-cyan
 * "tech" texture from the old identity, and rule 2 of the current system is
 * that backgrounds are flat colour. Both the veil and the asset are gone.
 */
function layout(size: OgImageSize, ...children: ReactNode[]): ReactNode {
  const { width, height } = getOgDimensions(size);
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        width,
        height,
        backgroundColor: colors.bg,
        fontFamily: 'Archivo',
        color: colors.text,
        position: 'relative' as const,
        overflow: 'hidden' as const,
      },
    },
    // Content area
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          flex: 1,
          padding: '52px 72px 26px',
          justifyContent: 'center',
        },
      },
      ...children,
    ),
    // Footer: wordmark and domain, split by the system's one hairline.
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          padding: '0 72px 44px',
        },
      },
      e('div', {
        style: { height: 1, backgroundColor: colors.border, marginBottom: 22 },
      }),
      e(
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
          { style: { display: 'flex', alignItems: 'center', gap: 13 } },
          brandMark(26),
          e(
            'div',
            {
              style: {
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: 3.2,
                color: colors.text,
              },
            },
            'GRAND PRIX PICKS',
          ),
        ),
        e(
          'div',
          {
            style: {
              fontSize: 18,
              fontFamily: 'IBM Plex Mono',
              color: colors.textMuted,
            },
          },
          'grandprixpicks.com',
        ),
      ),
    ),
  );
}

/**
 * A driver chip: team colour as a 3px left bar on a neutral surface.
 *
 * These used to be solid team-colour rectangles with the code in a translucent
 * black box on top. Five saturated fills in a row is exactly what the 3px rule
 * exists to prevent, and the eleven-team H2H cards were worse. Extra content
 * (a verdict tick) goes in `prefix`.
 */
function driverChip(
  code: string,
  teamColor: string,
  {
    width,
    height,
    fontSize,
    prefix,
    dim = false,
  }: {
    width: number;
    height: number;
    fontSize: number;
    prefix?: ReactNode;
    dim?: boolean;
  },
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        width,
        height,
        borderRadius: 2,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
      },
    },
    e('div', { style: { width: 3, backgroundColor: teamColor } }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          fontSize,
          fontWeight: 600,
          letterSpacing: 1.5,
          color: dim ? colors.textMuted : colors.text,
        },
      },
      prefix ?? null,
      code,
    ),
  );
}

/**
 * The small uppercase label above each card's headline figure.
 *
 * Muted, not accent. It used to be chartreuse on every share card, which put
 * two accent elements on cards whose whole point is one big accent number, and
 * "accent is rare" is the rule the palette rests on. A label is a label.
 */
function eyebrow(text: string): ReactNode {
  return e(
    'div',
    {
      style: {
        fontSize: 21,
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        letterSpacing: 3,
        color: colors.textMuted,
      },
    },
    text,
  );
}

// ────────── Next Race Template (the site-wide brand card) ──────────

export interface NextRaceOgData {
  raceName: string;
  round: number;
  season: number;
  /** Track-local lock date, already uppercased, e.g. "SAT 23 AUG". */
  lockDate: string;
  /** Track-local lock time with zone, e.g. "14:00 CEST". */
  lockTime: string;
  flagSrc?: string;
}

/**
 * A timing tower bleeding off the right edge: positions over gap bars, fading
 * as they descend.
 *
 * There is no licensed circuit artwork in the repo, and a freehand silhouette
 * reads as a blob to fans who know these shapes. The tower is the motif the
 * rest of the system already uses, needs no asset, and fills the dead right
 * half without competing with the headline.
 *
 * The bars are solid blocks on `surfaceElevated`, not the 1px hairlines this
 * started as. Hairlines of varying length on a near-black ground do not read
 * as a timing screen at any size; they read as a *loading skeleton*, which is
 * the last thing the site's own link preview should look like. Filled blocks
 * give the rows enough figure-to-ground contrast to scan as data, and the
 * leader keeps the one accent tick that says which row is P1.
 */
function timingTower(): ReactNode {
  const ROWS = 8;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'absolute' as const,
        // Overhangs so the longest bars run off the frame — a slice of a
        // timing screen, not a widget parked in the corner. The right offset
        // keeps the container's left edge (x = 1200 − width − right) clear of
        // the headline box, which ends at x = 784; at -120 the P-labels start
        // at x = 800 and nothing collides.
        right: -120,
        top: 96,
        width: 520,
      },
    },
    ...Array.from({ length: ROWS }, (_, index) => {
      const opacity = 1 - index / (ROWS + 1.2);
      return e(
        'div',
        {
          key: String(index),
          style: {
            display: 'flex',
            alignItems: 'center',
            height: 48,
            opacity,
          },
        },
        e('div', {
          style: {
            width: 3,
            height: 30,
            marginRight: 18,
            backgroundColor: index === 0 ? colors.accent : colors.borderStrong,
          },
        }),
        e(
          'div',
          {
            style: {
              width: 48,
              fontSize: 20,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              color: index === 0 ? colors.text : colors.textMuted,
            },
          },
          `P${index + 1}`,
        ),
        e('div', {
          style: {
            width: 210 + ((index * 67) % 240),
            height: 30,
            backgroundColor:
              index === 0 ? colors.accentMuted : colors.surfaceElevated,
          },
        }),
      );
    }),
  );
}

/** Lime separator dots — the one accent allowance on the brand card strip. */
function stripSep(): ReactNode {
  return e(
    'div',
    {
      style: {
        margin: '0 16px',
        fontSize: 22,
        fontWeight: 600,
        fontFamily: 'IBM Plex Mono',
        color: colors.accent,
      },
    },
    '·',
  );
}

function brandWordmark(): ReactNode {
  return e(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 12 } },
    brandMark(24),
    e(
      'div',
      {
        style: {
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 3.2,
          color: colors.textMuted,
        },
      },
      'GRAND PRIX PICKS',
    ),
  );
}

function brandHeadline(): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        fontSize: 72,
        fontWeight: 300,
        letterSpacing: -1.5,
        lineHeight: 1.12,
        color: colors.text,
        maxWidth: 720,
      },
    },
    // Typographic apostrophe: the straight quote is the one glyph on this card
    // that gives away that it was written in a code editor.
    e('div', {}, 'Everyone’s a strategist'),
    // "Prove it." in chartreuse. This is now the card's primary accent moment,
    // which is the point: the other three (brand mark, P1 tick, strip dots)
    // are all chrome, so the loudest colour on the card was never on the words
    // doing the selling. Split into two boxes rather than a nested span
    // because satori's inline handling is not reliable enough to trust a
    // colour change mid-line; the gap stands in for the word space that flex
    // would otherwise collapse.
    e(
      'div',
      { style: { display: 'flex', gap: 20 } },
      e('div', {}, 'on Sunday.'),
      e('div', { style: { color: colors.accent } }, 'Prove it.'),
    ),
  );
}

/**
 * The three ways a Top 5 pick scores, in the semantic colours the app already
 * uses for exactly this (`resultExact` / `resultNear` / `resultTop5`).
 *
 * Mirrors the landing page's scoring tiles down to the square-ended sector
 * rule, so the card and the page a reader lands on are visibly the same
 * product. It is also the only thing on this card that says what the game
 * *is*: the headline sells the feeling and the strip sells the price, and
 * before this there was nothing between them explaining the mechanic to
 * somebody who had never heard of the site.
 *
 * These colours are load-bearing rather than decorative, which is why three of
 * them are allowed on a card whose palette is otherwise one rare accent.
 */
const SCORING_BANDS = [
  {
    points: '5',
    unit: 'PTS',
    title: 'Exact position',
    color: colors.resultExact,
  },
  {
    points: '3',
    unit: 'PTS',
    title: 'One position away',
    color: colors.resultNear,
  },
  {
    points: '1',
    unit: 'PT',
    title: 'In the actual top 5',
    color: colors.resultTop5,
  },
] as const;

function scoringTile(band: (typeof SCORING_BANDS)[number]): ReactNode {
  return e(
    'div',
    {
      key: band.title,
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        width: 232,
        height: 132,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        // The sector rule is the bottom edge; a border under it would double
        // the line and round off the colour's square ends.
        borderBottom: 'none',
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          flex: 1,
          padding: '18px 20px 0',
        },
      },
      e(
        'div',
        { style: { display: 'flex', alignItems: 'flex-end', gap: 7 } },
        e(
          'div',
          {
            style: {
              fontSize: 42,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              lineHeight: 1,
              color: band.color,
            },
          },
          band.points,
        ),
        e(
          'div',
          {
            style: {
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: 2.2,
              paddingBottom: 3,
              color: band.color,
            },
          },
          band.unit,
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 14,
            fontSize: 19,
            fontWeight: 600,
          },
        },
        band.title,
      ),
    ),
    e('div', { style: { height: 7, backgroundColor: band.color } }),
  );
}

/**
 * Shared brand-card chrome: small wordmark, hook-first headline, timing tower
 * on the right, mono strip along the bottom. Priority for a stranger scrolling
 * a group chat is hook → urgency → brand — never the other way around.
 *
 * Laid out with absolute pins rather than flex space-between: Satori does not
 * reliably stretch an absolutely-positioned column to the full frame height,
 * which left the urgency strip floating under the headline and the bottom half
 * empty. Pins keep the hierarchy stable at thumbnail size.
 *
 * No drawn CTA button (not clickable in an OG image) and no domain (the
 * platform already shows it under the card). Accent is scarce and now spent
 * where it earns most: "Prove it." in the headline, with the tower's P1 tick,
 * the strip separator dots and the brand mark as chrome behind it. The scoring
 * tiles carry the only other colour, and it is semantic.
 *
 * The headline sat at 76px over a ~180px dead band, which is the space the
 * scoring row now fills. Dropping to 72px is what buys the tiles their width
 * without the two columns colliding: the longer headline line ends at x≈739
 * and the tower's labels start at x=800.
 */
function brandCardFrame(bottomStrip: ReactNode): ReactNode {
  const { width, height } = getOgDimensions('og');

  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative' as const,
        width,
        height,
        backgroundColor: colors.bg,
        fontFamily: 'Archivo',
        color: colors.text,
        overflow: 'hidden' as const,
      },
    },
    timingTower(),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute' as const,
          left: 64,
          top: 48,
        },
      },
      brandWordmark(),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute' as const,
          left: 64,
          top: 150,
        },
      },
      brandHeadline(),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          gap: 12,
          position: 'absolute' as const,
          left: 64,
          top: 372,
        },
      },
      ...SCORING_BANDS.map(scoringTile),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          position: 'absolute' as const,
          left: 64,
          right: 64,
          bottom: 48,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          letterSpacing: 1.6,
          color: colors.text,
        },
      },
      bottomStrip,
    ),
  );
}

/**
 * Evergreen fallback for off-season / render failures / non-race pages.
 * Same hook-first layout as the live next-race card; the strip is the mechanic
 * summary so it never names a round that will be stale next week.
 */
export function defaultBrandTemplate(): ReactNode {
  return brandCardFrame(
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center' } },
      e('div', {}, 'QUALI'),
      stripSep(),
      e('div', {}, 'SPRINT'),
      stripSep(),
      e('div', {}, 'RACE'),
      stripSep(),
      e('div', { style: { color: colors.textMuted } }, 'FREE TO PLAY'),
    ),
  );
}

/**
 * The card that fronts the site itself: what lands in a WhatsApp group, a
 * Discord channel or an X post when somebody drops the bare domain.
 *
 * Two jobs, in this order. It has to *hook* — so the headline is verbatim the
 * one on the landing page — and it has to be *current* — the Grand Prix and the
 * lock deadline are why a reader taps instead of scrolling. That is why this is
 * rendered per race; `defaultBrandTemplate` / `public/og-default.png` stays as
 * the off-season fallback.
 */
export function nextRaceTemplate(data: NextRaceOgData): ReactNode {
  const shortRaceName = data.raceName
    .replace(/\s+Grand Prix$/i, ' GP')
    .toUpperCase();

  return brandCardFrame(
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center' } },
      data.flagSrc
        ? e('img', {
            src: data.flagSrc,
            width: 36,
            height: 24,
            style: {
              marginRight: 14,
              borderRadius: 1,
              objectFit: 'cover' as const,
            },
          })
        : null,
      e('div', {}, shortRaceName),
      stripSep(),
      e(
        'div',
        { style: { color: colors.textMuted } },
        `PICKS LOCK ${data.lockDate} ${data.lockTime}`,
      ),
    ),
  );
}

// ────────── Share Picks Template ──────────

export interface SharePicksOgData {
  raceName: string;
  round: number;
  season: number;
  sessionLabel: string;
  by?: string;
  /** Country flag as a data URI (SVG), rendered next to the race name. */
  flagSrc?: string;
  /** Exactly 5 picks in predicted order, with resolved team colors. */
  picks: { code: string; color: string }[];
}

export type ShareResultsOgData = Omit<SharePicksOgData, 'by'>;

/** Race name row with optional country flag, shared by the share templates. */
function raceNameRow(
  raceName: string,
  flagSrc: string | undefined,
  fontSize: number,
): ReactNode {
  return e(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 24 } },
    flagSrc
      ? e('img', {
          src: flagSrc,
          width: 78,
          height: 52,
          style: {
            borderRadius: 2,
            objectFit: 'cover' as const,
          },
        })
      : null,
    e(
      'div',
      {
        style: {
          fontSize,
          fontWeight: 600,
          fontFamily: 'Archivo',
          lineHeight: 1.1,
          color: colors.text,
        },
      },
      raceName,
    ),
  );
}

export function sharePicksTemplate(
  data: SharePicksOgData,
  size: OgImageSize = 'og',
): ReactNode {
  return shareTopFiveTemplate(
    data,
    `${data.by ? `${data.by}'s` : 'My'} Top 5 \u00b7 ${data.sessionLabel}`,
    size,
  );
}

export function shareResultsTemplate(
  data: ShareResultsOgData,
  size: OgImageSize = 'og',
): ReactNode {
  return shareTopFiveTemplate(
    data,
    `${data.sessionLabel} Results \u00b7 Official Top 5`,
    size,
  );
}

export interface ShareH2HPicksOgData {
  raceName: string;
  round: number;
  season: number;
  sessionLabel: string;
  by?: string;
  flagSrc?: string;
  winners: { code: string; color: string }[];
}

export type ShareH2HResultsOgData = Omit<ShareH2HPicksOgData, 'by'>;

export function shareH2HPicksTemplate(
  data: ShareH2HPicksOgData,
  size: OgImageSize = 'og',
): ReactNode {
  return shareH2HWinnersTemplate(
    data,
    `${data.by ? `${data.by}'s` : 'My'} H2H Picks · ${data.sessionLabel}`,
    size,
  );
}

export function shareH2HResultsTemplate(
  data: ShareH2HResultsOgData,
  size: OgImageSize = 'og',
): ReactNode {
  return shareH2HWinnersTemplate(
    data,
    `${data.sessionLabel} H2H Results · Team-mate Winners`,
    size,
  );
}

function shareH2HWinnersTemplate(
  data: ShareH2HResultsOgData,
  heading: string,
  size: OgImageSize,
): ReactNode {
  return layout(
    size,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 24,
        },
      },
      eyebrow(heading),
      raceNameRow(data.raceName, data.flagSrc, 46),
      e(
        'div',
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 600 } },
        `Round ${data.round} \u00b7 ${data.season} Season`,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: 12,
            marginTop: 8,
          },
        },
        ...data.winners.map((winner, index) =>
          e(
            'div',
            { key: `${winner.code}-${index}`, style: { display: 'flex' } },
            driverChip(winner.code, winner.color, {
              width: 126,
              height: 62,
              fontSize: 28,
            }),
          ),
        ),
      ),
    ),
  );
}

export interface ShareH2HScoreOgData {
  raceName: string;
  round: number;
  season: number;
  sessionLabel: string;
  by?: string;
  flagSrc?: string;
  correct: number;
  total: number;
  points: number;
  /** Per-matchup verdicts with resolved team colors (older links omit them). */
  picks?: { code: string; color: string; correct: boolean }[];
}

/**
 * Tick or cross, drawn as SVG so no font glyph is needed.
 *
 * A miss is grey, never red. Red was the pre-theme reading and it made a
 * 6/11 card look like a system error rather than a middling weekend; the only
 * red left in the system is a downward position delta. Green stays, because a
 * correct call genuinely is the `resultNear` semantic (H2H scores 1 pt).
 */
function verdictIcon(correct: boolean): ReactNode {
  return e(
    'svg',
    {
      width: 20,
      height: 20,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: correct ? colors.resultNear : colors.resultMiss,
      'stroke-width': '4',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    correct
      ? e('path', { d: 'M20 6 9 17l-5-5' })
      : e('path', { d: 'M18 6 6 18M6 6l12 12' }),
  );
}

export function shareH2HScoreTemplate(
  data: ShareH2HScoreOgData,
  size: OgImageSize = 'og',
): ReactNode {
  const hasPicks = (data.picks?.length ?? 0) > 0;
  return layout(
    size,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          gap: hasPicks ? 18 : 22,
        },
      },
      eyebrow(
        `${data.by ? `${data.by}'s` : 'My'} Head-to-Head \u00b7 ${data.sessionLabel}`,
      ),
      e(
        'div',
        { style: { display: 'flex', alignItems: 'baseline', gap: 22 } },
        e(
          'div',
          {
            style: {
              fontSize: hasPicks ? 96 : 132,
              fontWeight: 600,
              // Every figure in the system is mono. This one was Archivo.
              fontFamily: 'IBM Plex Mono',
              lineHeight: 1,
              color: colors.accent,
            },
          },
          `${data.correct}/${data.total}`,
        ),
        e(
          'div',
          { style: { fontSize: 36, fontWeight: 600, color: colors.text } },
          'correct',
        ),
        e(
          'div',
          {
            style: {
              fontSize: 26,
              fontWeight: 600,
              color: colors.textMuted,
              marginLeft: 12,
            },
          },
          `+${data.points} pts`,
        ),
      ),
      hasPicks
        ? e(
            'div',
            {
              style: {
                display: 'flex',
                flexWrap: 'wrap' as const,
                gap: 10,
              },
            },
            ...(data.picks ?? []).map((pick, index) =>
              e(
                'div',
                {
                  key: `${pick.code}-${index}`,
                  style: { display: 'flex' },
                },
                driverChip(pick.code, pick.color, {
                  width: 122,
                  height: 52,
                  fontSize: 24,
                  prefix: verdictIcon(pick.correct),
                  // A miss recedes rather than shouting. The grey cross alone
                  // left hits and misses at identical weight.
                  dim: !pick.correct,
                }),
              ),
            ),
          )
        : null,
      raceNameRow(data.raceName, data.flagSrc, 42),
      e(
        'div',
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 600 } },
        `Round ${data.round} \u00b7 ${data.season} Season`,
      ),
    ),
  );
}

function shareTopFiveTemplate(
  data: SharePicksOgData | ShareResultsOgData,
  heading: string,
  size: OgImageSize,
): ReactNode {
  return layout(
    size,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 28,
        },
      },
      eyebrow(heading),
      raceNameRow(data.raceName, data.flagSrc, 52),
      e(
        'div',
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 600 } },
        `Round ${data.round} \u00b7 ${data.season} Season`,
      ),
      // Picks row: predicted slot above a chip carrying the team's 3px bar.
      // The slot number is mono, like every other figure in the system.
      e(
        'div',
        { style: { display: 'flex', gap: 20, marginTop: 12 } },
        ...data.picks.map((pick, i) =>
          e(
            'div',
            {
              key: String(i),
              style: {
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                gap: 10,
              },
            },
            e(
              'div',
              {
                style: {
                  fontSize: 21,
                  fontWeight: 600,
                  fontFamily: 'IBM Plex Mono',
                  color: colors.textMuted,
                },
              },
              `P${i + 1}`,
            ),
            driverChip(pick.code, pick.color, {
              width: 150,
              height: 84,
              fontSize: 34,
            }),
          ),
        ),
      ),
    ),
  );
}

// ────────── Share Score Template ──────────

export interface ShareScoreOgData {
  raceName: string;
  round: number;
  season: number;
  by?: string;
  /** Country flag as a data URI (SVG), rendered next to the race name. */
  flagSrc?: string;
  points: number;
  /** True once every event of the weekend has been scored. */
  final: boolean;
}

export function shareScoreTemplate(
  data: ShareScoreOgData,
  size: OgImageSize = 'og',
): ReactNode {
  return layout(
    size,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 24,
        },
      },
      eyebrow(
        `${data.by ? `${data.by}'s` : 'My'} ${data.final ? 'Weekend Total' : 'Points So Far'}`,
      ),
      e(
        'div',
        { style: { display: 'flex', alignItems: 'baseline', gap: 20 } },
        e(
          'div',
          {
            style: {
              fontSize: 150,
              fontWeight: 600,
              // Every figure in the system is mono. This one was Archivo.
              fontFamily: 'IBM Plex Mono',
              lineHeight: 1,
              color: colors.accent,
            },
          },
          String(data.points),
        ),
        e(
          'div',
          { style: { fontSize: 44, fontWeight: 600, color: colors.text } },
          'pts',
        ),
      ),
      raceNameRow(data.raceName, data.flagSrc, 44),
      e(
        'div',
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 600 } },
        `Round ${data.round} \u00b7 ${data.season} Season`,
      ),
    ),
  );
}

// ────────── Practice Results Card (social broadcast) ──────────

export type PracticeCardEntry = {
  position: number;
  code: string;
  color: string;
  bestLapSeconds: number | null;
  gapToLeaderSeconds: number | null;
  lapCount: number | null;
  isReserve: boolean;
};

/** 78.412 → "1:18.412" */
function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(3).padStart(6, '0')}`;
}

const PODIUM_COLORS = [colors.gold, colors.silver, colors.bronze];

function practiceRow(entry: PracticeCardEntry): ReactNode {
  const time =
    entry.position === 1 && entry.bestLapSeconds !== null
      ? formatLapTime(entry.bestLapSeconds)
      : entry.gapToLeaderSeconds !== null
        ? `+${entry.gapToLeaderSeconds.toFixed(3)}`
        : 'NO TIME';
  return e(
    'div',
    {
      key: entry.code,
      style: {
        display: 'flex',
        alignItems: 'center',
        height: 40,
        paddingLeft: 8,
        paddingRight: 12,
        borderRadius: 2,
        backgroundColor: entry.position <= 3 ? colors.surface : 'transparent',
      },
    },
    e(
      'div',
      {
        style: {
          width: 38,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          color: PODIUM_COLORS[entry.position - 1] ?? colors.textMuted,
        },
      },
      String(entry.position),
    ),
    e('div', {
      style: {
        width: 3,
        height: 24,
        marginRight: 15,
        backgroundColor: entry.color,
      },
    }),
    e(
      'div',
      {
        style: {
          width: 86,
          fontSize: 23,
          fontWeight: 600,
          fontFamily: 'Archivo',
          color: entry.isReserve ? colors.textMuted : colors.text,
        },
      },
      entry.code,
    ),
    e(
      'div',
      {
        style: {
          flex: 1,
          fontSize: 21,
          fontFamily: 'IBM Plex Mono',
          textAlign: 'right' as const,
          color: entry.position === 1 ? colors.accent : colors.text,
        },
      },
      time,
    ),
    e(
      'div',
      {
        style: {
          width: 54,
          fontSize: 17,
          fontFamily: 'IBM Plex Mono',
          textAlign: 'right' as const,
          color: colors.textMuted,
        },
      },
      entry.lapCount === null ? '' : `${entry.lapCount}L`,
    ),
  );
}

/**
 * Full-field practice classification card for posting to X as the brand
 * account. Unlike the share/* templates this is broadcast content, not a
 * per-user card, so it shows the entire field rather than a top-N summary.
 */
export function practiceResultsTemplate({
  raceName,
  round,
  season,
  sessionLabel,
  flagSrc,
  entries,
}: {
  raceName: string;
  round: number;
  season: number;
  sessionLabel: string;
  flagSrc?: string;
  entries: PracticeCardEntry[];
}): ReactNode {
  const half = Math.ceil(entries.length / 2);
  const columns = [entries.slice(0, half), entries.slice(half)];

  return layout(
    '16:9',
    // Header
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22,
        },
      },
      e(
        'div',
        { style: { display: 'flex', flexDirection: 'column' as const } },
        e(
          'div',
          {
            style: {
              fontSize: 20,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              letterSpacing: 2,
              color: colors.textMuted,
            },
          },
          `${season} · ROUND ${round}`,
        ),
        e(
          'div',
          {
            style: {
              fontSize: 40,
              fontWeight: 600,
              fontFamily: 'Archivo',
              marginTop: 4,
            },
          },
          raceName,
        ),
      ),
      e(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 18 } },
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 26,
              fontWeight: 600,
              fontFamily: 'Archivo',
              letterSpacing: 1,
              color: colors.text,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: 2,
              padding: '7px 18px',
            },
          },
          sessionLabel,
        ),
        flagSrc
          ? e('img', {
              src: flagSrc,
              width: 72,
              height: 48,
              style: { borderRadius: 2 },
            })
          : null,
      ),
    ),
    // Two-column classification
    e(
      'div',
      { style: { display: 'flex', gap: 40 } },
      ...columns.map((column, index) =>
        e(
          'div',
          {
            key: `col-${index}`,
            style: {
              display: 'flex',
              flexDirection: 'column' as const,
              flex: 1,
              gap: 2,
            },
          },
          ...column.map(practiceRow),
        ),
      ),
    ),
  );
}

// ────────── Team-mate H2H Results Card (social broadcast) ──────────

export type H2HCardRow = {
  team: string;
  color: string;
  winnerCode: string;
  loserCode: string;
};

/**
 * One team-mate matchup: team name over "winner BEAT loser".
 *
 * The winner used to sit on a solid team-colour badge, which needed
 * `h2hBadgeInk` to pick black-or-white text per livery just to stay legible.
 * That whole contrast dance existed only because the fill broke the 3px rule;
 * with the colour confined to a bar and a dot, the ink is always `text` and the
 * helper is gone. The flanking colour dashes around the team name went the same
 * way, replaced by the sanctioned 5px dot.
 */
function h2hMatchup(row: H2HCardRow): ReactNode {
  return e(
    'div',
    {
      key: row.team,
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        width: 300,
        height: 56,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 5,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.2,
          textTransform: 'uppercase' as const,
          color: colors.textMuted,
        },
      },
      e('div', {
        style: {
          width: 5,
          height: 5,
          marginRight: 8,
          borderRadius: 999,
          backgroundColor: row.color,
        },
      }),
      row.team,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      driverChip(row.winnerCode, row.color, {
        width: 96,
        height: 34,
        fontSize: 25,
      }),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 58,
            height: 22,
            marginLeft: 14,
            marginRight: 14,
            paddingTop: 1,
            borderRadius: 2,
            border: `1px solid ${colors.border}`,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            lineHeight: 1,
            color: colors.textMuted,
          },
        },
        'BEAT',
      ),
      e(
        'div',
        {
          style: {
            fontSize: 25,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: colors.textMuted,
          },
        },
        row.loserCode,
      ),
    ),
  );
}

/**
 * Team-mate head-to-head results card for posting as the brand account. Shows
 * every matchup for one session, winner first.
 */
export function h2hResultsTemplate({
  raceName,
  round,
  season,
  sessionLabel,
  flagSrc,
  rows,
}: {
  raceName: string;
  round: number;
  season: number;
  sessionLabel: string;
  flagSrc?: string;
  rows: H2HCardRow[];
}): ReactNode {
  const shortRaceName = raceName.replace(/\s+Grand Prix$/i, ' GP');
  // Two columns, matching the practice and classification cards. The eleven
  // matchups used to be absolutely positioned into a chevron by a table of
  // magic left/top pairs, because the chevron traced the light streaks in the
  // background artwork. With that artwork gone the shape had nothing to trace,
  // and a grid is what a timing sheet looks like anyway.
  const half = Math.ceil(rows.length / 2);
  const columns = [rows.slice(0, half), rows.slice(half)];

  return layout(
    '16:9',
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          textAlign: 'center' as const,
          marginBottom: 30,
        },
      },
      e(
        'div',
        {
          style: {
            fontSize: 48,
            fontWeight: 600,
            fontFamily: 'Archivo',
            lineHeight: 1,
          },
        },
        shortRaceName,
      ),
      e(
        'div',
        {
          style: {
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 2.2,
            color: colors.textMuted,
            marginTop: 7,
          },
        },
        `HEAD 2 HEAD / ${sessionLabel.toUpperCase()} RESULTS`,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 13,
          },
        },
        flagSrc
          ? e('img', {
              src: flagSrc,
              width: 54,
              height: 36,
              style: { borderRadius: 2, objectFit: 'cover' as const },
            })
          : null,
        e(
          'div',
          {
            style: {
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              letterSpacing: 2.2,
              color: colors.textMuted,
            },
          },
          `${season}  /  ROUND ${round}`,
        ),
      ),
    ),
    e(
      'div',
      { style: { display: 'flex', justifyContent: 'center', gap: 56 } },
      ...columns.map((column, index) =>
        e(
          'div',
          {
            key: `col-${index}`,
            style: {
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 14,
            },
          },
          ...column.map(h2hMatchup),
        ),
      ),
    ),
  );
}

// ────────── Session Classification Card (social broadcast) ──────────

export type SessionResultEntry = {
  position: number;
  code: string;
  name: string;
  color: string;
  /** DNF / DSQ / DNS / NC label, or null for ranked finishers. */
  status: string | null;
};

// Amber, not red: in this system red means one thing, a downward delta.
const STATUS_COLOR = colors.warning;

function sessionResultRow(entry: SessionResultEntry): ReactNode {
  return e(
    'div',
    {
      key: entry.code,
      style: {
        display: 'flex',
        alignItems: 'center',
        height: 40,
        paddingLeft: 8,
        paddingRight: 12,
        borderRadius: 2,
        backgroundColor: entry.position <= 3 ? colors.surface : 'transparent',
      },
    },
    e(
      'div',
      {
        style: {
          width: 38,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          color: PODIUM_COLORS[entry.position - 1] ?? colors.textMuted,
        },
      },
      String(entry.position),
    ),
    e('div', {
      style: {
        width: 3,
        height: 24,
        marginRight: 15,
        backgroundColor: entry.color,
      },
    }),
    e(
      'div',
      {
        style: {
          width: 84,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'Archivo',
          color: colors.text,
        },
      },
      entry.code,
    ),
    e(
      'div',
      { style: { flex: 1, fontSize: 19, color: colors.textMuted } },
      entry.name,
    ),
    entry.status
      ? e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 15,
              fontWeight: 600,
              color: STATUS_COLOR,
            },
          },
          entry.status,
        )
      : null,
  );
}

/**
 * Full classification for a scored session (qualifying, sprint, or race) as a
 * card for posting as the brand account.
 */
export function sessionResultsTemplate({
  raceName,
  round,
  season,
  sessionLabel,
  flagSrc,
  entries,
}: {
  raceName: string;
  round: number;
  season: number;
  sessionLabel: string;
  flagSrc?: string;
  entries: SessionResultEntry[];
}): ReactNode {
  const half = Math.ceil(entries.length / 2);
  const columns = [entries.slice(0, half), entries.slice(half)];

  return layout(
    '16:9',
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22,
        },
      },
      e(
        'div',
        { style: { display: 'flex', flexDirection: 'column' as const } },
        e(
          'div',
          {
            style: {
              fontSize: 20,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              letterSpacing: 2,
              color: colors.textMuted,
            },
          },
          `${season} · ROUND ${round}`,
        ),
        e(
          'div',
          {
            style: {
              fontSize: 40,
              fontWeight: 600,
              fontFamily: 'Archivo',
              marginTop: 4,
            },
          },
          raceName,
        ),
      ),
      e(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 18 } },
        e(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: 24,
              fontWeight: 600,
              fontFamily: 'Archivo',
              letterSpacing: 1,
              color: colors.text,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: 2,
              padding: '7px 18px',
            },
          },
          sessionLabel.toUpperCase(),
        ),
        flagSrc
          ? e('img', {
              src: flagSrc,
              width: 72,
              height: 48,
              style: { borderRadius: 2 },
            })
          : null,
      ),
    ),
    e(
      'div',
      { style: { display: 'flex', gap: 40 } },
      ...columns.map((column, index) =>
        e(
          'div',
          {
            key: `col-${index}`,
            style: {
              display: 'flex',
              flexDirection: 'column' as const,
              flex: 1,
              gap: 2,
            },
          },
          ...column.map(sessionResultRow),
        ),
      ),
    ),
  );
}
