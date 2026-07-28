import type { Meta, StoryObj } from '@storybook/react';

import { LeaderboardTeaser } from './LeaderboardTeaser';

const meta = {
  title: 'Home/LeaderboardTeaser',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const players = [
  { rank: 1, userId: 'u1', username: 'barry', points: 412, raceCount: 14 },
  { rank: 2, userId: 'u2', username: 'lewis', points: 398, raceCount: 14 },
  { rank: 3, userId: 'u3', username: 'charles', points: 371, raceCount: 14 },
  { rank: 4, userId: 'u4', username: 'lando', points: 350, raceCount: 14 },
  { rank: 5, userId: 'u5', username: 'oscar', points: 336, raceCount: 13 },
];

/** The podium medals are the reason this has a story: ranks 1-3 wear a
 *  metallic treatment that exists nowhere else in the app. */
export const Default: Story = {
  render: () => (
    <div className="max-w-md">
      <LeaderboardTeaser players={players} />
    </div>
  ),
};

export const WithDisplayNames: Story = {
  render: () => (
    <div className="max-w-md">
      <LeaderboardTeaser
        players={players.map((p, i) => ({
          ...p,
          displayName: [
            'Barry Doyle',
            'Lewis H',
            'Charles L',
            'Lando N',
            'Oscar P',
          ][i],
        }))}
      />
    </div>
  ),
};
