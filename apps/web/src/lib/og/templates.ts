import type { ReactNode } from 'react';
import { createElement } from 'react';

import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../teamColors';
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
export function brandMark(
  size: number,
  fill: string = colors.accent,
): ReactNode {
  return e(
    'svg',
    { width: size, height: size * (40 / 60), viewBox: '0 0 60 40' },
    e(
      'g',
      {
        fill,
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
                color: colors.text,
              },
            },
            'Grand Prix Picks',
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
  /** Town the circuit is in, e.g. "Monza". Falls back to the season. */
  venue?: string;
  flagSrc?: string;
}

/**
 * The brand card is the one surface in the system set ON the accent.
 *
 * Rule 3 of the design system says the accent is never a large fill except a
 * primary button, and that is exactly what this card is: the only thing it
 * exists to do is get tapped, and it competes in a feed of dark and white
 * cards where a near-black card with a chartreuse word read as "boring and
 * bland" (Barry, 2026-10-09). So the card is the button. Everything on it is
 * ink: near-black type, near-black chips, a near-black rail. The player share
 * cards stay on the dark ground, which is what makes this one the billboard.
 *
 * The ink-on-accent pairing is the same as the primary button's, so the
 * contrast is already known to pass. There is no token for muted ink on
 * accent (the app never sets secondary text on a button), so the two labels
 * use the ink at reduced alpha rather than inventing a colour.
 */
const INK = colors.textOnAccent;
const INK_MUTED = 'rgba(16, 17, 19, 0.62)';
const INK_HAIRLINE = 'rgba(16, 17, 19, 0.28)';

/**
 * The five slots of a pick sheet, laid out as a row of chips under the
 * headline: the product itself, at a size that survives a 500px preview.
 *
 * This replaces a boxed five-row table parked in the right-hand third of the
 * card. At preview size that table was a grey form with 10px driver codes,
 * and because it took a third of the width it also capped the headline at
 * 68px light, which thinned to nothing in a group chat. Stacking the two
 * instead of siding them lets the headline run the full width and gives each
 * code 40px.
 *
 * The chips lean at the brand mark's own 12 degrees. The lean is the whole
 * racing personality of the system (the mark, the stripe motif), and five
 * upright boxes under a headline read as a form. The content is skewed back
 * so the type stays upright.
 *
 * The codes are a fixed illustrative Top 5, not a house prediction and not
 * live data: this card is cached by scrapers for weeks, so anything that moves
 * with results would be wrong more often than right. The `P1`..`P5` labels are
 * the picks form's own slot labels, which is what keeps it reading as a sheet
 * rather than a tip. Update the list when the grid changes, the same way any
 * other hard-coded roster fact is updated.
 */
const SHEET_ROWS = [
  { code: 'VER', team: 'Red Bull Racing' },
  { code: 'NOR', team: 'McLaren' },
  { code: 'LEC', team: 'Ferrari' },
  { code: 'RUS', team: 'Mercedes' },
  { code: 'PIA', team: 'McLaren' },
] as const;

const FRAME_INSET = 64;
const SHEET_GAP = 12;
const SHEET_LEAN_DEG = 12;
const CHIP_HEIGHT = 112;
/**
 * How far a chip's bottom-left corner lands left of its top-left corner. The
 * row is inset by this on both sides so the slanted envelope sits exactly on
 * the 64px frame inset: without it P1's bottom corner overhung the headline's
 * left edge and P5's top corner poked past the band's right edge.
 */
const SHEET_LEAN_PX = Math.round(
  (CHIP_HEIGHT / 2) * Math.tan((SHEET_LEAN_DEG * Math.PI) / 180),
);

function pickSheet(top: number): ReactNode {
  const { width } = getOgDimensions('og');
  const rowInset = FRAME_INSET + SHEET_LEAN_PX;
  const chipWidth =
    (width - rowInset * 2 - SHEET_GAP * (SHEET_ROWS.length - 1)) /
    SHEET_ROWS.length;

  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'absolute' as const,
        left: rowInset,
        top,
        gap: SHEET_GAP,
      },
    },
    ...SHEET_ROWS.map((row, index) =>
      e(
        'div',
        {
          key: row.code,
          style: {
            display: 'flex',
            width: chipWidth,
            height: CHIP_HEIGHT,
            backgroundColor: INK,
            borderRadius: 2,
            transform: `skewX(-${SHEET_LEAN_DEG}deg)`,
          },
        },
        // Team colour confined to a bar, as everywhere else in the system.
        e('div', {
          style: {
            width: 4,
            backgroundColor: TEAM_COLORS[row.team] ?? FALLBACK_TEAM_COLOR,
          },
        }),
        e(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column' as const,
              justifyContent: 'center',
              flex: 1,
              paddingLeft: 24,
              color: colors.text,
              transform: `skewX(${SHEET_LEAN_DEG}deg)`,
            },
          },
          e(
            'div',
            {
              style: {
                fontFamily: 'IBM Plex Mono',
                fontSize: 18,
                fontWeight: 600,
                color: colors.textMuted,
              },
            },
            `P${index + 1}`,
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                marginTop: 2,
                fontSize: 44,
                fontWeight: 600,
                letterSpacing: 0.5,
                lineHeight: 1.1,
              },
            },
            row.code,
          ),
        ),
      ),
    ),
  );
}

function brandWordmark(): ReactNode {
  return e(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 13 } },
    brandMark(30, INK),
    e(
      'div',
      {
        style: {
          fontSize: 22,
          fontWeight: 600,
        },
      },
      'Grand Prix Picks',
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
        fontSize: 104,
        fontWeight: 600,
        letterSpacing: -4.5,
        lineHeight: 1.0,
      },
    },
    // Same two lines as the landing `h1`, and they have to stay that way: this
    // card is what the bare domain unfurls to, so a visitor meets the headline
    // here and then again at the top of the page they land on. The page sets
    // it light with the second line in accent; the card sets both lines in
    // ink at semibold, because on an accent ground there is no accent word to
    // give, and a 300-weight headline at the 500px a chat app renders
    // previews at reads as grey.
    e('div', {}, 'Predict the F1 Top 5,'),
    e('div', {}, 'session by session.'),
  );
}

/**
 * A label over a figure, the way the app sets every piece of timing data.
 *
 * `mono` follows the site's split rather than taste: IBM Plex Mono is for
 * figures a reader compares or reads off a clock, Archivo for names.
 */
function bandStat(
  label: string,
  value: string,
  align: 'flex-start' | 'flex-end',
  mono = false,
  rail = false,
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: align,
        // The same 3px rail the landing page puts beside its session clock,
        // in ink here because the ground is already the accent. It is the one
        // thing on the card marking why a reader should tap now rather than
        // later.
        //
        // Spread rather than set to `undefined`: satori 0.29 runs every style
        // value through its own expander, and an undefined `borderLeft` throws
        // there. Every OG route catches its own errors and serves the static
        // fallback, so that mistake ships as a card that never names the race.
        ...(rail ? { borderLeft: `3px solid ${INK}`, paddingLeft: 22 } : {}),
      },
    },
    e(
      'div',
      {
        style: {
          fontFamily: 'IBM Plex Mono',
          fontSize: 16,
          color: INK_MUTED,
        },
      },
      label,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 6,
          fontFamily: mono ? 'IBM Plex Mono' : 'Archivo',
          fontSize: 32,
          fontWeight: 600,
          lineHeight: 1.15,
        },
      },
      value,
    ),
  );
}

/**
 * Shared brand-card chrome, stacked top to bottom: wordmark, headline, pick
 * sheet, hairline, data band. Priority for a stranger scrolling a group chat
 * is hook → what the game is → which race and by when, and the stack puts
 * them in that order at sizes that hold up at preview scale.
 *
 * Laid out with absolute pins rather than flex spacing: Satori does not
 * reliably stretch an absolutely-positioned column to the full frame height,
 * which left earlier versions of this band floating under the headline with
 * the bottom half of the card empty. Pins keep the hierarchy stable.
 *
 * No drawn CTA button (not clickable in an OG image) and no domain (the
 * platform already shows it under the card).
 */
function brandCardFrame(bandLeft: ReactNode, bandRight: ReactNode): ReactNode {
  const { width, height } = getOgDimensions('og');

  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative' as const,
        width,
        height,
        backgroundColor: colors.accent,
        fontFamily: 'Archivo',
        color: INK,
        overflow: 'hidden' as const,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute' as const,
          left: FRAME_INSET,
          top: 44,
        },
      },
      brandWordmark(),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          position: 'absolute' as const,
          left: FRAME_INSET,
          top: 108,
        },
      },
      brandHeadline(),
    ),
    pickSheet(346),
    // The system's one elevation mechanism, separating the pitch from the data.
    e('div', {
      style: {
        position: 'absolute' as const,
        left: FRAME_INSET,
        right: FRAME_INSET,
        bottom: 118,
        height: 1,
        backgroundColor: INK_HAIRLINE,
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          position: 'absolute' as const,
          left: FRAME_INSET,
          right: FRAME_INSET,
          bottom: 44,
        },
      },
      bandLeft,
      bandRight,
    ),
  );
}

/**
 * Evergreen fallback for off-season / render failures / non-race pages.
 *
 * Same layout as the live next-race card, with the band carrying facts that
 * cannot go stale: there is no round to name and no deadline to count down.
 */
export function defaultBrandTemplate(): ReactNode {
  return brandCardFrame(
    bandStat('Every race weekend', 'Quali · Sprint · Race', 'flex-start'),
    bandStat('Entry', 'Free to play', 'flex-end'),
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
  const roundLabel = data.venue
    ? `Round ${data.round} · ${data.venue}`
    : `Round ${data.round} · ${data.season}`;

  return brandCardFrame(
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 18 } },
      data.flagSrc
        ? e('img', {
            src: data.flagSrc,
            width: 48,
            height: 32,
            // A hairline, because any flag with a white field (Singapore,
            // Japan, Monaco) otherwise bleeds into the chartreuse ground.
            style: {
              borderRadius: 1,
              objectFit: 'cover' as const,
              border: `1px solid ${INK_HAIRLINE}`,
            },
          })
        : null,
      bandStat(roundLabel, data.raceName, 'flex-start'),
    ),
    // Same separator the landing clock uses for the same two facts.
    bandStat(
      'Picks lock',
      `${data.lockDate} · ${data.lockTime}`,
      'flex-start',
      true,
      true,
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
    `${data.sessionLabel} results \u00b7 Official Top 5`,
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
    `${data.by ? `${data.by}'s` : 'My'} H2H picks · ${data.sessionLabel}`,
    size,
  );
}

export function shareH2HResultsTemplate(
  data: ShareH2HResultsOgData,
  size: OgImageSize = 'og',
): ReactNode {
  return shareH2HWinnersTemplate(
    data,
    `${data.sessionLabel} H2H results · Team-mate winners`,
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
        `${data.by ? `${data.by}'s` : 'My'} head-to-head \u00b7 ${data.sessionLabel}`,
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
        `${data.by ? `${data.by}'s` : 'My'} ${data.final ? 'weekend total' : 'points so far'}`,
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
        : 'No time';
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
              color: colors.textMuted,
            },
          },
          `${season} · Round ${round}`,
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

// ────────── Qualifying Championship Card ──────────

export type QualifyingChampionshipEntry = {
  position: number;
  code: string;
  color: string;
  points: number;
  /** Places better (positive) or worse (negative) than the real championship. */
  delta: number;
};

/**
 * The signed movement column, drawn rather than typed: Archivo and IBM Plex
 * Mono carry no reliable ▲/▼ glyphs, and satori renders whatever the font
 * lacks as tofu. Same green/red semantics as the app's `RankDelta`.
 */
function deltaCell(delta: number): ReactNode {
  if (delta === 0) {
    return e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          width: 64,
          fontSize: 19,
          fontFamily: 'IBM Plex Mono',
          color: colors.textMuted,
        },
      },
      '–',
    );
  }
  const up = delta > 0;
  const color = up ? colors.deltaUp : colors.deltaDown;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 5,
        width: 64,
      },
    },
    e(
      'svg',
      { width: 11, height: 11, viewBox: '0 0 24 24' },
      e('path', {
        d: up ? 'M12 4 2.5 20h19z' : 'M12 20 2.5 4h19z',
        fill: color,
      }),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 20,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          color,
        },
      },
      String(Math.abs(delta)),
    ),
  );
}

function qualifyingChampionshipRow(
  entry: QualifyingChampionshipEntry,
): ReactNode {
  return e(
    'div',
    {
      key: entry.code,
      style: {
        display: 'flex',
        alignItems: 'center',
        height: 42,
        paddingLeft: 8,
        paddingRight: 12,
        borderRadius: 2,
        backgroundColor: entry.position <= 2 ? colors.surface : 'transparent',
      },
    },
    e(
      'div',
      {
        style: {
          width: 36,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          // Saturday's podium is the front row, so only P1 and P2 take a
          // medal colour — the same depth the page's table shades.
          color:
            entry.position <= 2
              ? PODIUM_COLORS[entry.position - 1]
              : colors.textMuted,
        },
      },
      String(entry.position),
    ),
    e('div', {
      style: {
        width: 3,
        height: 24,
        marginRight: 14,
        backgroundColor: entry.color,
      },
    }),
    e(
      'div',
      {
        style: {
          flex: 1,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'Archivo',
          color: colors.text,
        },
      },
      entry.code,
    ),
    deltaCell(entry.delta),
    // A fixed points column rather than flex against the delta: right-aligned
    // mono butted against right-aligned mono read as one number ("▲11 140"
    // rendered as 11140).
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          width: 76,
          marginLeft: 22,
          fontSize: 21,
          fontFamily: 'IBM Plex Mono',
          color: entry.position === 1 ? colors.accent : colors.text,
        },
      },
      String(entry.points),
    ),
  );
}

/**
 * The OG card for `/f1-qualifying-standings`: the top ten of the season scored
 * on qualifying alone, each with their movement against the real championship.
 *
 * Standard OG size, because this sits under a link rather than being posted as
 * the brand account — the platform supplies the headline, so the card's job is
 * to look like the table the page delivers.
 */
export function qualifyingChampionshipTemplate({
  season,
  roundsScored,
  entries,
}: {
  season: number;
  roundsScored: number;
  entries: QualifyingChampionshipEntry[];
}): ReactNode {
  const top = entries.slice(0, 10);
  const half = Math.ceil(top.length / 2);
  const columns = [top.slice(0, half), top.slice(half)];

  return layout(
    'og',
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 24,
        },
      },
      e(
        'div',
        { style: { display: 'flex', flexDirection: 'column' as const } },
        e(
          'div',
          {
            style: {
              fontSize: 19,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              color: colors.textMuted,
            },
          },
          `${season} · after ${roundsScored} ${roundsScored === 1 ? 'round' : 'rounds'}`,
        ),
        e(
          'div',
          {
            style: {
              fontSize: 42,
              fontWeight: 600,
              fontFamily: 'Archivo',
              marginTop: 4,
            },
          },
          'Qualifying Championship',
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'flex-end',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'IBM Plex Mono',
            lineHeight: 1.6,
            color: colors.textMuted,
            textAlign: 'right' as const,
          },
        },
        e('div', {}, 'Change shown against'),
        e('div', {}, 'the World Championship'),
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
          ...column.map(qualifyingChampionshipRow),
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
            lineHeight: 1,
            color: colors.textMuted,
          },
        },
        'Beat',
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
            color: colors.textMuted,
            marginTop: 7,
          },
        },
        `Head 2 head / ${sessionLabel} results`,
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
              color: colors.textMuted,
            },
          },
          `${season}  /  Round ${round}`,
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
              color: colors.textMuted,
            },
          },
          `${season} · Round ${round}`,
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

export type LineUp2027OpenSeat = {
  driver: string;
  team: string;
  color: string;
};

/** One of the three status counts, as a labelled figure. */
function seatCountBlock(
  label: string,
  value: number,
  color: string,
): ReactNode {
  return e(
    'div',
    {
      key: label,
      style: { display: 'flex', flexDirection: 'column' as const, flex: 1 },
    },
    e('div', {
      style: { width: 34, height: 3, backgroundColor: color, marginBottom: 14 },
    }),
    e(
      'div',
      {
        style: {
          fontSize: 56,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          lineHeight: 1,
        },
      },
      String(value),
    ),
    e(
      'div',
      {
        style: {
          fontSize: 17,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          color: colors.textMuted,
          marginTop: 12,
        },
      },
      label,
    ),
  );
}

/** One driver whose seat has no 2027 contract behind it. */
function openSeatRow(seat: LineUp2027OpenSeat): ReactNode {
  return e(
    'div',
    {
      key: seat.driver,
      style: { display: 'flex', alignItems: 'center', gap: 14, flex: 1 },
    },
    e('div', {
      style: { width: 3, height: 34, backgroundColor: seat.color },
    }),
    e(
      'div',
      { style: { display: 'flex', flexDirection: 'column' as const } },
      e(
        'div',
        { style: { fontSize: 28, fontWeight: 600, fontFamily: 'Archivo' } },
        seat.driver,
      ),
      e(
        'div',
        {
          style: {
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'IBM Plex Mono',
            color: colors.textMuted,
            marginTop: 3,
          },
        },
        seat.team,
      ),
    ),
  );
}

/**
 * The link-preview card for `/f1-2027-driver-line-up`.
 *
 * Leads with the count rather than a grid of 22 names, because the count is
 * the thing that changes and the thing somebody shares the page for. The two
 * out-of-contract drivers get their names on the card for the same reason:
 * they are the story, and a card that only said "2027 line-up" would give a
 * scroller no reason to tap.
 *
 * Every value comes from `src/lib/lineUp2027.ts` by way of the route handler,
 * so the card cannot drift from the page it fronts.
 */
export function lineUp2027Template({
  reviewedLabel,
  signed,
  expected,
  outOfContract,
  total,
  openSeats,
}: {
  reviewedLabel: string;
  signed: number;
  expected: number;
  outOfContract: number;
  total: number;
  openSeats: LineUp2027OpenSeat[];
}): ReactNode {
  return layout(
    'og',
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 40,
        },
      },
      e(
        'div',
        { style: { display: 'flex', flexDirection: 'column' as const } },
        e(
          'div',
          {
            style: {
              fontSize: 19,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              color: colors.textMuted,
            },
          },
          '2027 driver line-up',
        ),
        e(
          'div',
          {
            style: {
              fontSize: 46,
              fontWeight: 600,
              fontFamily: 'Archivo',
              marginTop: 4,
            },
          },
          `${signed} of ${total} seats signed`,
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'IBM Plex Mono',
            color: colors.textMuted,
          },
        },
        `Reviewed ${reviewedLabel}`,
      ),
    ),
    e(
      'div',
      { style: { display: 'flex', gap: 40, marginBottom: 44 } },
      seatCountBlock('Signed', signed, colors.accent),
      seatCountBlock('Expected', expected, colors.borderStrong),
      seatCountBlock('Out of contract', outOfContract, colors.warning),
    ),
    e('div', {
      style: { height: 1, backgroundColor: colors.border, marginBottom: 26 },
    }),
    e(
      'div',
      {
        style: {
          fontSize: 15,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          color: colors.textMuted,
          marginBottom: 18,
        },
      },
      'Still to be decided',
    ),
    e(
      'div',
      { style: { display: 'flex', gap: 40 } },
      ...openSeats.slice(0, 2).map(openSeatRow),
    ),
  );
}

/**
 * The link-preview card for any `/guides/<slug>` article.
 *
 * One template for every guide, because a guide's card has exactly the job its
 * front matter already does: name the subject and give a reason to tap. Both
 * strings come from `guideMeta.ts` by way of the route handler, so a card
 * cannot describe a guide differently from the page it fronts, and a new guide
 * gets a card by existing rather than by anyone remembering to draw one.
 *
 * Deliberately typographic. The other data cards lead with a number because
 * they front a number; a guide fronts a sentence, and inventing a statistic to
 * decorate it would put something on the card that is not on the page.
 */
export function guideTemplate({
  title,
  summary,
}: {
  title: string;
  summary: string;
}): ReactNode {
  return layout(
    'og',
    e(
      'div',
      {
        style: {
          fontSize: 19,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono',
          color: colors.textMuted,
        },
      },
      'F1 guide',
    ),
    e(
      'div',
      {
        style: {
          fontSize: 56,
          fontWeight: 600,
          fontFamily: 'Archivo',
          lineHeight: 1.12,
          marginTop: 14,
        },
      },
      title,
    ),
    e('div', {
      style: {
        height: 1,
        backgroundColor: colors.border,
        marginTop: 32,
        marginBottom: 24,
      },
    }),
    e(
      'div',
      {
        style: {
          fontSize: 26,
          lineHeight: 1.4,
          color: colors.textMuted,
        },
      },
      summary,
    ),
  );
}
