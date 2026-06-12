import type { ReactNode } from 'react';
import { createElement } from 'react';

import type { OgImageSize } from './styles';
import { colors, getOgDimensions } from './styles';

// Shorthand for React.createElement — satori accepts ReactNode trees.
const e = createElement;

/** Shared outer wrapper: dark bg, accent stripe at top, branding at bottom. */
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
        fontFamily: 'Inter',
        color: colors.text,
        position: 'relative' as const,
        overflow: 'hidden' as const,
      },
    },
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
            fontWeight: 700,
            fontFamily: 'Orbitron',
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
              borderRadius: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accentMuted,
            },
          },
          e(
            'svg',
            {
              width: 20,
              height: 20,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: colors.accent,
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              style: { transform: 'translateX(1px)' },
            },
            e('path', {
              d: 'M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528',
            }),
          ),
        ),
        'Grand Prix Picks',
      ),
      e(
        'div',
        { style: { fontSize: 18, fontWeight: 700, color: colors.accent } },
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
              borderRadius: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accentMuted,
            },
          },
          e(
            'svg',
            {
              width: 72,
              height: 72,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: colors.accent,
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              style: { transform: 'translateX(1px)' },
            },
            e('path', {
              d: 'M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528',
            }),
          ),
        ),
        e(
          'div',
          {
            style: {
              fontSize: 82,
              fontWeight: 700,
              fontFamily: 'Orbitron',
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
            fontWeight: 700,
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
              fontWeight: 700,
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
                  fontWeight: 700,
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
            fontWeight: 700,
            fontFamily: 'Orbitron',
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
              fontWeight: 700,
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
          fontWeight: 700,
          fontFamily: 'Orbitron',
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
            fontWeight: 700,
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
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 700 } },
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
                  fontWeight: 700,
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
            fontWeight: 700,
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
              fontWeight: 700,
              fontFamily: 'Orbitron',
              lineHeight: 1,
              color: colors.accent,
            },
          },
          `${data.correct}/${data.total}`,
        ),
        e(
          'div',
          { style: { fontSize: 36, fontWeight: 700, color: colors.text } },
          'correct',
        ),
        e(
          'div',
          {
            style: {
              fontSize: 26,
              fontWeight: 700,
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
                      fontWeight: 700,
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
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 700 } },
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
            fontWeight: 700,
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
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 700 } },
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
                  fontWeight: 700,
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
                    fontWeight: 700,
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
            fontWeight: 700,
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
              fontWeight: 700,
              fontFamily: 'Orbitron',
              lineHeight: 1,
              color: colors.accent,
            },
          },
          String(data.points),
        ),
        e(
          'div',
          { style: { fontSize: 44, fontWeight: 700, color: colors.text } },
          'pts',
        ),
      ),
      raceNameRow(data.raceName, data.flagSrc, 44),
      e(
        'div',
        { style: { fontSize: 22, color: colors.textMuted, fontWeight: 700 } },
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
                fontWeight: 700,
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
              fontWeight: 700,
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
      { style: { fontSize: 36, fontWeight: 700, color: colors.accent } },
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
            fontWeight: 700,
            fontFamily: 'Orbitron',
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
                  fontWeight: 700,
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
                  fontWeight: 700,
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
