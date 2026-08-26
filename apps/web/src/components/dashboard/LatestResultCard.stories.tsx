import type { Meta, StoryObj } from '@storybook/react';

import { fakeId } from '@/storybook/fixtures';
import { LatestResultCard } from './LatestResultCard';

type Props = Parameters<typeof LatestResultCard>[0];

const raceId = fakeId<'races'>('netherlands-2026');
const viewerId = fakeId<'users'>('viewer');

function weekend(overrides: Partial<Props['weekend']> = {}) {
  return {
    raceId,
    raceSlug: 'netherlands-2026',
    raceName: 'Dutch Grand Prix',
    raceRound: 12,
    raceStatus: 'finished' as const,
    raceDate: Date.UTC(2026, 7, 23, 13, 0),
    hasSprint: false,
    sessions: { quali: null, sprint_quali: null, sprint: null, race: null },
    totalPoints: 93,
    hasScores: true,
    top5Rank: 1,
    top5FieldSize: 14,
    submittedAt: Date.UTC(2026, 7, 22, 9, 0),
    ...overrides,
  } as NonNullable<Props['weekend']>;
}

function leaderboard(entry: { top5Points: number; h2hPoints: number }) {
  return {
    status: 'visible' as const,
    reason: null,
    entries: [
      {
        rank: 1,
        userId: viewerId,
        username: 'you',
        displayName: 'You',
        avatarUrl: undefined,
        points: entry.top5Points + entry.h2hPoints,
        ...entry,
        isViewer: true,
      },
    ],
  } as NonNullable<Props['leaderboard']>;
}

const meta = {
  title: 'Dashboard/LatestResultCard',
  component: LatestResultCard,
  parameters: { layout: 'centered' },
  // The width the card gets in the dashboard's right rail, which is the only
  // place it renders and the width its layout has to survive.
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LatestResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scored: Story = {
  args: {
    weekend: weekend(),
    leaderboard: leaderboard({ top5Points: 82, h2hPoints: 11 }),
    loading: false,
  },
};

/**
 * The weekend leaderboard has not loaded (or is locked), so every number falls
 * back to the history payload: no H2H split, and the rank comes from `top5Rank`.
 */
export const WithoutLeaderboard: Story = {
  args: {
    weekend: weekend({ totalPoints: 47, top5Rank: 6, top5FieldSize: 14 }),
    leaderboard: undefined,
    loading: false,
  },
};

/** The longest race name on the calendar, which is what truncation is for. */
export const LongRaceName: Story = {
  args: {
    weekend: weekend({
      raceName: 'Mexico City Grand Prix',
      raceSlug: 'mexico-2026',
    }),
    leaderboard: leaderboard({ top5Points: 61, h2hPoints: 9 }),
    loading: false,
  },
};

export const Loading: Story = {
  args: { weekend: undefined, leaderboard: undefined, loading: true },
};

/** No scored weekend yet, in the rail where the placeholder earns its place. */
export const Empty: Story = {
  args: { weekend: undefined, leaderboard: undefined, loading: false },
};
