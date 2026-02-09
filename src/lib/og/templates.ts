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
        { style: { fontSize: 18, color: colors.textMuted } },
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
          gap: 24,
        },
      },
      e(
        'div',
        {
          style: {
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            color: colors.text,
          },
        },
        'Grand Prix Picks',
      ),
      e(
        'div',
        {
          style: {
            fontSize: 28,
            color: colors.textMuted,
            maxWidth: 700,
            lineHeight: 1.4,
          },
        },
        'Predict the top 5 for every F1 session and compete with friends throughout the 2026 season.',
      ),
    ),
  );
}

// ────────── Race Template ──────────

export interface RaceOgData {
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

export interface ProfileOgData {
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

export interface LeaderboardOgEntry {
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
          gap: 32,
        },
      },
      e(
        'div',
        {
          style: {
            fontSize: 48,
            fontWeight: 700,
            color: colors.text,
          },
        },
        'Season Leaderboard',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 16,
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
                padding: '16px 24px',
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
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: podiumColors[i],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: colors.bg,
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
                  fontSize: 28,
                  fontWeight: 700,
                  color: colors.text,
                },
              },
              entry.username,
            ),
            // Points
            e(
              'div',
              {
                style: {
                  fontSize: 28,
                  fontWeight: 700,
                  color: colors.accent,
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
