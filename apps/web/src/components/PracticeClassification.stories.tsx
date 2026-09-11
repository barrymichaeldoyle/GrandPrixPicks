import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import type { Meta, StoryObj } from '@storybook/react';
import { emptyReactionCounts } from '@grandprixpicks/shared/reactions';
import { PracticeClassification } from './PracticeClassification';
import { PracticePublishedItem } from './FeedItem/PracticePublishedItem';
import {
  StorybookMockProviders,
  buildStorybookConvexMocks,
} from '@/storybook/mockAppRuntime';
import type { PracticeResults } from '@/lib/practiceSessions';

// Madrid FP1, published 11 September 2026. Static visual-review fixture.
const rows: [string, string, string | null, number, number, number][] = [
  ['RUS', 'George RUSSELL', 'Mercedes', 63.0, 94.077, 28.0],
  ['ANT', 'Kimi ANTONELLI', 'Mercedes', 12.0, 94.363, 27.0],
  ['LEC', 'Charles LECLERC', 'Ferrari', 16.0, 94.536, 27.0],
  ['HAM', 'Lewis HAMILTON', 'Ferrari', 44.0, 94.62, 27.0],
  ['VER', 'Max VERSTAPPEN', 'Red Bull Racing', 3.0, 94.703, 25.0],
  ['NOR', 'Lando NORRIS', 'McLaren', 1.0, 94.947, 27.0],
  ['LIN', 'Arvid LINDBLAD', 'Racing Bulls', 41.0, 95.033, 28.0],
  ['PIA', 'Oscar PIASTRI', 'McLaren', 81.0, 95.148, 22.0],
  ['HUL', 'Nico HULKENBERG', 'Audi', 27.0, 95.529, 26.0],
  ['LAW', 'Liam LAWSON', 'Red Bull Racing', 30.0, 95.539, 26.0],
  ['BOR', 'Gabriel BORTOLETO', 'Audi', 5.0, 95.652, 27.0],
  ['OCO', 'Esteban OCON', 'Haas F1 Team', 31.0, 95.834, 25.0],
  ['COL', 'Franco COLAPINTO', 'Alpine', 43.0, 95.933, 24.0],
  ['GAS', 'Pierre GASLY', 'Alpine', 10.0, 96.244, 23.0],
  ['ALO', 'Fernando ALONSO', 'Aston Martin', 14.0, 96.473, 27.0],
  ['BEA', 'Oliver BEARMAN', 'Haas F1 Team', 87.0, 96.853, 24.0],
  ['SAI', 'Carlos SAINZ', 'Williams', 55.0, 96.87, 30.0],
  ['TSU', 'Yuki TSUNODA', 'Racing Bulls', 22.0, 96.939, 16.0],
  ['STR', 'Lance STROLL', 'Aston Martin', 18.0, 97.254, 26.0],
  ['ALB', 'Alexander ALBON', 'Williams', 23.0, 97.591, 25.0],
  ['PER', 'Sergio PEREZ', 'Cadillac', 11.0, 98.15, 26.0],
  ['BOT', 'Valtteri BOTTAS', 'Cadillac', 77.0, 98.818, 25.0],
];
const results: PracticeResults = [
  {
    sessionType: 'fp1',
    publishedAt: 1789131395126,
    entries: rows.map(
      (
        [code, displayName, team, driverNumber, bestLapSeconds, lapCount],
        index,
      ) => ({
        code,
        displayName,
        team,
        driverNumber,
        bestLapSeconds,
        lapCount,
        position: index + 1,
        gapToLeaderSeconds:
          Math.round((bestLapSeconds - rows[0][4]) * 1000) / 1000,
        isReserve: false,
      }),
    ),
  },
];
const meta = {
  title: 'Results/PracticeClassification',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Writeup: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl">
      <PracticeClassification results={results} raceSlug="madrid-2026" />
    </div>
  ),
};
export const Feed: Story = {
  render: () => (
    <StorybookMockProviders
      convex={buildStorybookConvexMocks({
        queries: [[api.practiceResults.getPracticeResultsForRace, results]],
      })}
    >
      <div className="mx-auto max-w-xl rounded-sm border border-border bg-surface p-2.5">
        <PracticePublishedItem
          event={{
            _id: 'practice-fixture' as Id<'feedEvents'>,
            type: 'practice_published',
            raceId: 'madrid-fixture' as Id<'races'>,
            raceName: 'Spanish Grand Prix',
            raceSlug: 'madrid-2026',
            practiceSessionType: 'fp1',
            createdAt: 1789131395126,
            reactionCount: 0,
            reactionCounts: emptyReactionCounts(),
            viewerReaction: null,
          }}
        />
      </div>
    </StorybookMockProviders>
  ),
};
