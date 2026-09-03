import type { Id } from '@convex-generated/dataModel';
import type { Meta, StoryObj } from '@storybook/react';

import type { RaceRecap } from './RaceRecapCard';
import { RaceRecapCard } from './RaceRecapCard';

const RACE = {
  id: 'race_1' as Id<'races'>,
  slug: 'bahrain-2026',
  name: 'Bahrain Grand Prix',
  round: 16,
  raceStartAt: Date.now() - 3 * 60 * 60 * 1000,
};

function recap(overrides: Partial<RaceRecap> = {}): RaceRecap {
  return {
    race: RACE,
    windowEndsAt: RACE.raceStartAt + 8 * 60 * 60 * 1000,
    serverNow: Date.now(),
    status: 'scored',
    playerCount: 128,
    viewer: {
      points: 24,
      top5Points: 20,
      h2hPoints: 4,
      rank: 12,
      fieldSize: 128,
      seasonRank: 7,
      seasonRankDelta: 2,
    },
    friends: [],
    friendCount: 0,
    ...overrides,
  } as RaceRecap;
}

const FRIENDS: RaceRecap['friends'] = [
  {
    userId: 'u2' as Id<'users'>,
    username: 'kimirocket',
    displayName: 'Kimi',
    avatarUrl: undefined,
    rank: 4,
    points: 31,
    isViewer: false,
  },
  {
    userId: 'u1' as Id<'users'>,
    username: 'barry',
    displayName: 'Barry',
    avatarUrl: undefined,
    rank: 12,
    points: 24,
    isViewer: true,
  },
  {
    userId: 'u3' as Id<'users'>,
    username: 'gridwalker',
    displayName: 'Gridwalker',
    avatarUrl: undefined,
    rank: 40,
    points: 14,
    isViewer: false,
  },
];

const meta = {
  title: 'Dashboard/RaceRecapCard',
  component: RaceRecapCard,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof RaceRecapCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full card: the viewer's result, their season move, and who they follow. */
export const WithFollowedPlayers: Story = {
  args: { recap: recap({ friends: FRIENDS, friendCount: 2 }) },
};

/** A player who follows nobody yet still gets their own result first. */
export const ViewerOnly: Story = {
  args: { recap: recap() },
};

/** The race has run and nothing is scored yet. */
export const ResultsPending: Story = {
  args: {
    recap: recap({ status: 'pending', viewer: null, playerCount: 0 }),
  },
};

/** Someone who did not enter this weekend but follows players who did. */
export const NoPicks: Story = {
  args: {
    recap: recap({
      viewer: null,
      friends: FRIENDS.filter((player) => !player.isViewer),
      friendCount: 2,
    }),
  },
};

/** Stacked under another card, which drops the leading card's top offset. */
export const Stacked: Story = {
  args: { recap: recap({ friends: FRIENDS, friendCount: 2 }), leading: false },
};
