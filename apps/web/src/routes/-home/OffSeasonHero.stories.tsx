import type { Meta, StoryObj } from '@storybook/react-vite';

import { OffSeasonHero } from './OffSeasonHero';

/** A week after the 2026 finale. */
const now = Date.UTC(2026, 11, 14, 12);

const podium = {
  season: 2026,
  players: [
    { rank: 1, userId: 'u1', username: 'OvercutKing', points: 612 },
    { rank: 2, userId: 'u2', username: 'ApexPredator', points: 579 },
    { rank: 3, userId: 'u3', username: 'UndercutAce', points: 566 },
  ],
};

const meta = {
  title: 'Landing/OffSeasonHero',
  component: OffSeasonHero,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="bg-page">
        <Story />
      </div>
    ),
  ],
  args: { podium, now },
} satisfies Meta<typeof OffSeasonHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AfterTheFinale: Story = {};

/** A shared podium place shares the fill. */
export const TiedForSecond: Story = {
  args: {
    podium: {
      season: 2026,
      players: [
        { rank: 1, userId: 'u1', username: 'OvercutKing', points: 612 },
        { rank: 2, userId: 'u2', username: 'ApexPredator', points: 579 },
        { rank: 2, userId: 'u3', username: 'UndercutAce', points: 579 },
      ],
    },
  },
};

export const NoStandings: Story = { args: { podium: null } };
