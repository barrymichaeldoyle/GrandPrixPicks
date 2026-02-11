import type { ReactNode } from 'react';
import { createElement } from 'react';

import { colors, OG_HEIGHT, OG_WIDTH } from './styles';

// Shorthand for React.createElement — satori accepts ReactNode trees.
const e = createElement;

/** Shared outer wrapper: dark bg, accent stripe at top, branding at bottom. */
function layout(...children: Array<ReactNode>): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        width: OG_WIDTH,
        height: OG_HEIGHT,
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
        background: `linear-gradient(to right, ${colors.accent}, ${colors.accentLight})`,
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
            color: colors.accent,
          },
        },
        'Grand Prix Picks',
      ),
      e(
        'div',
        { style: { fontSize: 18, color: colors.text } },
        'grandprixpicks.com',
      ),
    ),
  );
}

// ────────── Home Template ──────────

export function homeTemplate(): ReactNode {
  return layout(
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
        // Lucide Flag icon (24x24 viewBox, scaled to 72px)
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
          },
          e('path', {
            d: 'M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528',
          }),
        ),
        e(
          'div',
          {
            style: {
              fontSize: 82,
              fontWeight: 700,
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

export function raceTemplate(race: RaceOgData): ReactNode {
  const dateStr = new Date(race.raceStartAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const statusColors: Record<string, string> = {
    upcoming: '#22c55e',
    locked: '#eab308',
    finished: colors.textMuted,
  };
  const statusColor = statusColors[race.status] ?? colors.textMuted;

  return layout(
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
                  backgroundColor: `${colors.accent}22`,
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

export function profileTemplate(profile: ProfileOgData): ReactNode {
  const initials = (profile.displayName || profile.username)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return layout(
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
  entries: Array<LeaderboardOgEntry>,
): ReactNode {
  const podiumColors = [colors.gold, colors.silver, colors.bronze];

  return layout(
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
