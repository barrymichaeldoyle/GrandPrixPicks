import type { Meta, StoryObj } from '@storybook/react';

import { fakeId } from '@/storybook/fixtures';
import { railDecorator } from '@/storybook/railDecorator';
import { SeasonStandingCard } from './SeasonStandingCard';

type Leaderboard = Parameters<typeof SeasonStandingCard>[0]['leaderboard'];

function leaderboard(
  entry: {
    rank: number;
    points: number;
    top5Points: number;
    h2hPoints: number;
  } | null,
  totalCount = 1_284,
) {
  return {
    entries: [],
    totalCount,
    viewerEntry: entry
      ? { ...entry, userId: fakeId<'users'>('viewer'), username: 'you' }
      : null,
  } as unknown as Leaderboard;
}

const meta = {
  title: 'Dashboard/Rail/SeasonStandingCard',
  component: SeasonStandingCard,
  decorators: railDecorator,
} satisfies Meta<typeof SeasonStandingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ranked: Story = {
  args: {
    leaderboard: leaderboard({
      rank: 47,
      points: 612,
      top5Points: 534,
      h2hPoints: 78,
    }),
  },
};

/** A four-digit rank and points, which is what the number sizes have to hold. */
export const DeepInTheField: Story = {
  args: {
    leaderboard: leaderboard(
      { rank: 1_038, points: 1_204, top5Points: 1_090, h2hPoints: 114 },
      12_460,
    ),
  },
};

/** Signed in, nothing scored yet. The rail keeps this rather than an empty column. */
export const NoRankYet: Story = { args: { leaderboard: leaderboard(null) } };

export const Loading: Story = { args: { leaderboard: undefined } };
