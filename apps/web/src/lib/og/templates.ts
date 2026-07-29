import type { ReactNode } from 'react';
import { createElement } from 'react';

import { relativeLuminance } from '../color';
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
function brandMark(size: number): ReactNode {
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

/** Shared outer wrapper: dark bg, accent stripe at top, branding at bottom. */
function layout(size: OgImageSize, ...children: ReactNode[]): ReactNode {
  return layoutWithBackground(size, undefined, ...children);
}

function layoutWithBackground(
  size: OgImageSize,
  backgroundSrc: string | undefined,
  ...children: ReactNode[]
): ReactNode {
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
    backgroundSrc
      ? [
          e('img', {
            key: 'background',
            src: backgroundSrc,
            width,
            height,
            style: {
              position: 'absolute' as const,
              inset: 0,
              width,
              height,
            },
          }),
          e('div', {
            key: 'background-veil',
            style: {
              position: 'absolute' as const,
              inset: 0,
              backgroundColor: colors.bg,
              opacity: 0.42,
            },
          }),
        ]
      : null,
    // Accent stripe at top
    e('div', {
      style: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: `linear-gradient(to right, ${colors.accent}, ${colors.accentHover})`,
      },
    }),
    // Content area
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          flex: 1,
          padding: '48px 64px 32px',
          justifyContent: 'center',
        },
      },
      ...children,
    ),
    // Footer branding
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 64px 32px',
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 20,
            fontWeight: 600,
            fontFamily: 'Archivo',
            color: colors.text,
          },
        },
        // Flag inside subtle accent circle, matching app header/footer
        e(
          'div',
          {
            style: {
              width: 32,
              height: 32,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accentMuted,
            },
          },
          brandMark(20),
        ),
        'Grand Prix Picks',
      ),
      e(
        'div',
        { style: { fontSize: 18, fontWeight: 600, color: colors.accent } },
        'grandprixpicks.com',
      ),
    ),
  );
}

// ────────── Home Template ──────────

export function homeTemplate(size: OgImageSize = 'og'): ReactNode {
  return layout(
    size,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
          gap: 40,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          },
        },
        // Flag icon inside accent circle (matches header/footer, nudged 1px right)
        e(
          'div',
          {
            style: {
              width: 96,
              height: 96,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accentMuted,
            },
          },
          brandMark(72),
        ),
        e(
          'div',
          {
            style: {
              fontSize: 82,
              fontWeight: 600,
              fontFamily: 'Archivo',
              lineHeight: 1.1,
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
            fontSize: 34,
            color: colors.textMuted,
            maxWidth: 900,
            lineHeight: 1.4,
          },
        },
        'Predict the top 5 finishers for every qualifying, sprint, and race. Compete with friends all season long.',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
            padding: '20px 56px',
            backgroundColor: colors.buttonAccent,
            borderRadius: 14,
            fontSize: 30,
            fontWeight: 600,
            color: 'white',
          },
        },
        'Start Predicting \u2192',
      ),
    ),
  );
}

// ────────── Race Template ──────────

interface RaceOgData {
  name: string;
  round: number;
  season: number;
  raceStartAt: number;
  hasSprint?: boolean;
  status: string;
}

export function raceTemplate(
  race: RaceOgData,
  size: OgImageSize = 'og',
): ReactNode {
  const dateStr = new Date(race.raceStartAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const statusColors: Record<string, string> = {
    upcoming: colors.statusUpcoming,
    locked: colors.statusLocked,
    finished: colors.textMuted,
  };
  const statusColor = statusColors[race.status] ?? colors.textMuted;

  return layout(
    size,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 20,
        },
      },
      // Status + sprint badge row
      e(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 16 } },
        e(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 18,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: 2,
              color: statusColor,
            },
          },
          e('div', {
            style: {
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: statusColor,
            },
          }),
          race.status,
        ),
        race.hasSprint
          ? e(
              'div',
              {
                style: {
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.accent,
                  backgroundColor: colors.accentMuted,
                  padding: '4px 12px',
                  borderRadius: 6,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 1,
                },
              },
              'Sprint Weekend',
            )
          : null,
      ),
      // Race name
      e(
        'div',
        {
          style: {
            fontSize: 56,
            fontWeight: 600,
            fontFamily: 'Archivo',
            lineHeight: 1.1,
            color: colors.text,
          },
        },
        race.name,
      ),
      // Round + date
      e(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 24 } },
        e(
          'div',
          {
            style: {
              fontSize: 24,
              color: colors.textMuted,
              fontWeight: 600,
            },
          },
          `Round ${race.round} \u00b7 ${race.season} Season`,
        ),
      ),
      e('div', { style: { fontSize: 22, color: colors.textMuted } }, dateStr),
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
          width: 84,
          height: 56,
          style: {
            borderRadius: 8,
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
    `${data.sessionLabel} H2H Results · Teammate Winners`,
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
      e(
        'div',
        {
          style: {
            fontSize: 22,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: 3,
            color: colors.accent,
          },
        },
        heading,
      ),
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
            {
              key: `${winner.code}-${index}`,
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 126,
                height: 62,
                borderRadius: 12,
                backgroundColor: winner.color,
              },
            },
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  padding: '6px 14px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'white',
                  letterSpacing: 2,
                },
              },
              winner.code,
            ),
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

/** Small green check / red cross icon, drawn as SVG so no font glyph is needed. */
function verdictIcon(correct: boolean): ReactNode {
  return e(
    'svg',
    {
      width: 20,
      height: 20,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: correct ? '#4ade80' : '#f87171',
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
      e(
        'div',
        {
          style: {
            fontSize: 22,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: 3,
            color: colors.accent,
          },
        },
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
              fontFamily: 'Archivo',
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
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 122,
                    height: 52,
                    borderRadius: 10,
                    backgroundColor: pick.color,
                  },
                },
                e(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 12px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      fontSize: 24,
                      fontWeight: 600,
                      color: 'white',
                      letterSpacing: 2,
                    },
                  },
                  verdictIcon(pick.correct),
                  pick.code,
                ),
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
      e(
        'div',
        {
          style: {
            fontSize: 22,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: 3,
            color: colors.accent,
          },
        },
        heading,
      ),
      raceNameRow(data.raceName, data.flagSrc, 52),
      e(
        'div',
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 600 } },
        `Round ${data.round} \u00b7 ${data.season} Season`,
      ),
      // Picks row: position + driver code chips in team colors
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
                  fontSize: 22,
                  fontWeight: 600,
                  color: colors.textMuted,
                },
              },
              `P${i + 1}`,
            ),
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 150,
                  height: 84,
                  borderRadius: 14,
                  backgroundColor: pick.color,
                },
              },
              e(
                'div',
                {
                  style: {
                    display: 'flex',
                    padding: '8px 18px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    fontSize: 34,
                    fontWeight: 600,
                    color: 'white',
                    letterSpacing: 2,
                  },
                },
                pick.code,
              ),
            ),
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
      e(
        'div',
        {
          style: {
            fontSize: 22,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: 3,
            color: colors.accent,
          },
        },
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
              fontFamily: 'Archivo',
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

// ────────── Profile Template ──────────

interface ProfileOgData {
  displayName: string;
  username: string;
  avatarUrl?: string;
  totalPoints: number;
  seasonRank: number | null;
  totalPlayers: number;
  weekendCount: number;
}

export function profileTemplate(
  profile: ProfileOgData,
  size: OgImageSize = 'og',
): ReactNode {
  const initials = (profile.displayName || profile.username)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return layout(
    size,
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 40 } },
      // Avatar
      profile.avatarUrl
        ? e('img', {
            src: profile.avatarUrl,
            width: 140,
            height: 140,
            style: { borderRadius: 70, objectFit: 'cover' as const },
          })
        : e(
            'div',
            {
              style: {
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                fontWeight: 600,
                color: 'white',
              },
            },
            initials,
          ),
      // Name + username
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 8,
          },
        },
        e(
          'div',
          {
            style: {
              fontSize: 48,
              fontWeight: 600,
              lineHeight: 1.1,
              color: colors.text,
            },
          },
          profile.displayName || profile.username,
        ),
        e(
          'div',
          { style: { fontSize: 28, color: colors.textMuted } },
          `@${profile.username}`,
        ),
      ),
    ),
    // Stats row
    e(
      'div',
      {
        style: {
          display: 'flex',
          gap: 32,
          marginTop: 40,
        },
      },
      statBox(String(profile.totalPoints), 'Total Points'),
      profile.seasonRank !== null
        ? statBox(
            `#${profile.seasonRank}`,
            `of ${profile.totalPlayers} players`,
          )
        : null,
      statBox(String(profile.weekendCount), 'Weekends'),
    ),
  );
}

function statBox(value: string, label: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        padding: '16px 32px',
        backgroundColor: colors.surface,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
      },
    },
    e(
      'div',
      { style: { fontSize: 36, fontWeight: 600, color: colors.accent } },
      value,
    ),
    e('div', { style: { fontSize: 16, color: colors.textMuted } }, label),
  );
}

// ────────── Leaderboard Template ──────────

interface LeaderboardOgEntry {
  rank: number;
  username: string;
  points: number;
}

export function leaderboardTemplate(
  entries: LeaderboardOgEntry[],
  size: OgImageSize = 'og',
): ReactNode {
  const podiumColors = [colors.gold, colors.silver, colors.bronze];

  return layout(
    size,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          gap: 32,
          width: '100%',
        },
      },
      e(
        'div',
        {
          style: {
            fontSize: 48,
            fontWeight: 600,
            fontFamily: 'Archivo',
            color: colors.text,
            textAlign: 'center' as const,
          },
        },
        '2026 Season Leaderboard',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 12,
            width: '100%',
            maxWidth: 800,
          },
        },
        ...entries.slice(0, 3).map((entry, i) =>
          e(
            'div',
            {
              key: String(i),
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '12px 24px',
                backgroundColor: colors.surface,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
              },
            },
            // Rank badge
            e(
              'div',
              {
                style: {
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: podiumColors[i],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 600,
                  color: colors.bg,
                  flexShrink: 0,
                },
              },
              String(entry.rank),
            ),
            // Username
            e(
              'div',
              {
                style: {
                  flex: 1,
                  fontSize: 26,
                  fontWeight: 600,
                  color: colors.text,
                  overflow: 'hidden' as const,
                  textOverflow: 'ellipsis' as const,
                  whiteSpace: 'nowrap' as const,
                },
              },
              entry.username,
            ),
            // Points
            e(
              'div',
              {
                style: {
                  fontSize: 26,
                  fontWeight: 600,
                  color: colors.accent,
                  flexShrink: 0,
                  textAlign: 'right' as const,
                },
              },
              `${entry.points} pts`,
            ),
          ),
        ),
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
        borderRadius: 6,
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
          color: PODIUM_COLORS[entry.position - 1] ?? colors.textMuted,
        },
      },
      String(entry.position),
    ),
    e('div', {
      style: {
        width: 4,
        height: 24,
        borderRadius: 2,
        marginRight: 14,
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
              letterSpacing: 2,
              color: colors.accent,
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
              color: colors.bg,
              backgroundColor: colors.accent,
              borderRadius: 8,
              padding: '8px 18px',
            },
          },
          sessionLabel,
        ),
        flagSrc
          ? e('img', {
              src: flagSrc,
              width: 72,
              height: 48,
              style: { borderRadius: 6 },
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

// ────────── Teammate H2H Results Card (social broadcast) ──────────

export type H2HCardRow = {
  team: string;
  color: string;
  winnerCode: string;
  loserCode: string;
};

function h2hBadgeInk(background: string): string {
  const hex = background.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return colors.text;
  }
  const backgroundLuminance = relativeLuminance(hex);
  const darkLuminance = relativeLuminance('020617');
  const lightLuminance = relativeLuminance('f8fafc');
  const darkContrast = (backgroundLuminance + 0.05) / (darkLuminance + 0.05);
  const lightContrast = (lightLuminance + 0.05) / (backgroundLuminance + 0.05);
  return darkContrast >= lightContrast ? '#020617' : colors.text;
}

function h2hMatchup(row: H2HCardRow): ReactNode {
  const badgeInk = h2hBadgeInk(row.color);

  return e(
    'div',
    {
      key: row.team,
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
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
          marginBottom: 4,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.2,
          textTransform: 'uppercase' as const,
          color: '#cbd5e1',
        },
      },
      e('div', {
        style: {
          width: 28,
          height: 4,
          marginRight: 9,
          borderRadius: 999,
          backgroundColor: row.color,
        },
      }),
      row.team,
      e('div', {
        style: {
          width: 28,
          height: 4,
          marginLeft: 9,
          borderRadius: 999,
          backgroundColor: row.color,
        },
      }),
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
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 86,
            height: 34,
            borderRadius: 4,
            backgroundColor: row.color,
            fontSize: 27,
            fontWeight: 600,
            fontFamily: 'Archivo',
            color: badgeInk,
          },
        },
        row.winnerCode,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 24,
            marginLeft: 16,
            marginRight: 16,
            paddingTop: 1,
            borderRadius: 999,
            border: '1px solid #475569',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1,
            color: colors.text,
          },
        },
        'BEAT',
      ),
      e(
        'div',
        {
          style: {
            fontSize: 27,
            fontWeight: 600,
            fontFamily: 'Archivo',
            color: '#cbd5e1',
          },
        },
        row.loserCode,
      ),
    ),
  );
}

/**
 * Teammate head-to-head results card for posting as the brand account. Shows
 * every matchup for one session, winner first.
 */
export function h2hResultsTemplate({
  raceName,
  round,
  season,
  sessionLabel,
  flagSrc,
  backgroundSrc,
  rows,
}: {
  raceName: string;
  round: number;
  season: number;
  sessionLabel: string;
  flagSrc?: string;
  backgroundSrc?: string;
  rows: H2HCardRow[];
}): ReactNode {
  const matchupPositions = [
    { left: 426, top: 12 },
    { left: 280, top: 344 },
    { left: 572, top: 344 },
    { left: 215, top: 258 },
    { left: 637, top: 258 },
    { left: 150, top: 172 },
    { left: 702, top: 172 },
    { left: 85, top: 86 },
    { left: 767, top: 86 },
    { left: 20, top: 0 },
    { left: 832, top: 0 },
  ] as const;
  const shortRaceName = raceName.replace(/\s+Grand Prix$/i, ' GP');

  return layoutWithBackground(
    '16:9',
    backgroundSrc,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative' as const,
          top: -10,
          marginBottom: 18,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            textAlign: 'center' as const,
            maxWidth: 960,
          },
        },
        e(
          'div',
          {
            style: {
              fontSize: 52,
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
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: 2.2,
              color: colors.textMuted,
              marginTop: 5,
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
              marginTop: 12,
            },
          },
          flagSrc
            ? e(
                'div',
                {
                  style: {
                    display: 'flex',
                    width: 112,
                    height: 38,
                    overflow: 'hidden' as const,
                  },
                },
                e('img', {
                  src: flagSrc,
                  width: 112,
                  height: 75,
                  style: { transform: 'translateY(-18px)' },
                }),
              )
            : null,
          e(
            'div',
            {
              style: {
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 2.2,
                color: colors.accent,
              },
            },
            `${season}  /  ROUND ${round}`,
          ),
        ),
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'relative' as const,
          top: -2,
          height: 400,
        },
      },
      ...rows.map((row, index) =>
        e(
          'div',
          {
            key: row.team,
            style: {
              display: 'flex',
              position: 'absolute' as const,
              left: matchupPositions[index]?.left ?? 0,
              top: matchupPositions[index]?.top ?? 0,
              width: 285,
            },
          },
          h2hMatchup(row),
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

const STATUS_COLOR = '#f87171';

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
        borderRadius: 6,
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
          color: PODIUM_COLORS[entry.position - 1] ?? colors.textMuted,
        },
      },
      String(entry.position),
    ),
    e('div', {
      style: {
        width: 4,
        height: 24,
        borderRadius: 2,
        marginRight: 14,
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
              letterSpacing: 2,
              color: colors.accent,
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
              color: colors.bg,
              backgroundColor: colors.accent,
              borderRadius: 8,
              padding: '8px 18px',
            },
          },
          sessionLabel.toUpperCase(),
        ),
        flagSrc
          ? e('img', {
              src: flagSrc,
              width: 72,
              height: 48,
              style: { borderRadius: 6 },
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
