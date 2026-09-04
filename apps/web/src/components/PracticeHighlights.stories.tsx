import type { Meta, StoryObj } from '@storybook/react';

import { PracticeHighlights } from './PracticeHighlights';
import type { PracticeResults } from '@/lib/practiceSessions';

type Entry = PracticeResults[number]['entries'][number];

function entries(
  rows: [
    code: string,
    name: string,
    team: string,
    number: number,
    lap: number,
  ][],
): Entry[] {
  return rows.map(
    ([code, displayName, team, driverNumber, bestLapSeconds], index) => ({
      driverNumber,
      code,
      displayName,
      team,
      position: index + 1,
      bestLapSeconds,
      gapToLeaderSeconds: Number((bestLapSeconds - rows[0][4]).toFixed(3)),
      lapCount: 26 + index,
      isReserve: false,
    }),
  );
}

/** Monza 2026, the top six of each session as published. */
const MONZA: PracticeResults = [
  {
    sessionType: 'fp1',
    publishedAt: Date.parse('2026-09-04T11:51:35Z'),
    entries: entries([
      ['LEC', 'Charles LECLERC', 'Ferrari', 16, 83.008],
      ['HAM', 'Lewis HAMILTON', 'Ferrari', 44, 83.181],
      ['RUS', 'George RUSSELL', 'Mercedes', 63, 83.312],
      ['LAW', 'Liam LAWSON', 'Red Bull Racing', 30, 83.433],
      ['ANT', 'Kimi ANTONELLI', 'Mercedes', 12, 83.644],
      ['NOR', 'Lando NORRIS', 'McLaren', 1, 83.719],
    ]),
  },
  {
    sessionType: 'fp2',
    publishedAt: Date.parse('2026-09-04T15:26:35Z'),
    entries: entries([
      ['RUS', 'George RUSSELL', 'Mercedes', 63, 82.559],
      ['LEC', 'Charles LECLERC', 'Ferrari', 16, 82.679],
      ['ANT', 'Kimi ANTONELLI', 'Mercedes', 12, 82.7],
      ['NOR', 'Lando NORRIS', 'McLaren', 1, 82.943],
      ['HAM', 'Lewis HAMILTON', 'Ferrari', 44, 83.016],
      ['PIA', 'Oscar PIASTRI', 'McLaren', 81, 83.028],
    ]),
  },
];

const meta = {
  title: 'Components/PracticeHighlights',
  component: PracticeHighlights,
  parameters: { layout: 'padded' },
  // The dashboard's centre column, which is the only width this block renders at.
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-2xl">
        <Story />
      </div>
    ),
  ],
  args: { raceSlug: 'italy-2026', results: MONZA },
} satisfies Meta<typeof PracticeHighlights>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Friday evening: both sessions in, side by side. */
export const FridayEvening: Story = {};

/** Friday lunchtime: FP1 alone takes the full width. */
export const FirstSessionOnly: Story = {
  args: { results: [MONZA[0]] },
};

/** Saturday morning, once FP3 lands and three sessions share the row. */
export const AllThreeSessions: Story = {
  args: {
    results: [
      ...MONZA,
      { ...MONZA[1], sessionType: 'fp3', publishedAt: Date.now() },
    ],
  },
};
