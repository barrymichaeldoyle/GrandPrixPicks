import type { Meta, StoryObj } from '@storybook/react';

import type { Doc, Id } from '../../convex/_generated/dataModel';
import { StorybookRouter } from '../stories/router-decorator';
import { RaceCard } from './RaceCard';

/** Mock race for Storybook (no Convex). */
function mockRace(
  overrides: Partial<Doc<'races'> & { _id: Id<'races'> }> = {},
): Doc<'races'> & { _id: Id<'races'> } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return {
    _id: 'mockRace1' as Id<'races'>,
    _creationTime: now,
    season: 2026,
    round: 1,
    name: 'Bahrain Grand Prix',
    slug: 'bahrain-2026',
    raceStartAt: now + 7 * day,
    qualiStartAt: now + 6 * day + 12 * 60 * 60 * 1000,
    predictionLockAt: now + 6 * day,
    status: 'upcoming',
    createdAt: now - 30 * day,
    updatedAt: now,
    ...overrides,
  };
}

const meta: Meta<typeof RaceCard> = {
  component: RaceCard,
  decorators: [
    (Story) => (
      <StorybookRouter>
        <Story />
      </StorybookRouter>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RaceCard>;

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

/** All race card states in one view (grid on large screens, stack on small). */
const ALL_STATES = [
  {
    label: 'Next up (open for predictions)',
    race: mockRace({
      _id: 'next' as Id<'races'>,
      round: 1,
      name: 'Bahrain Grand Prix',
      slug: 'bahrain-2026',
      status: 'upcoming',
    }),
    isNext: true,
    predictionOpenAt: null,
  },
  {
    label: 'Upcoming (not yet open)',
    race: mockRace({
      _id: 'upcoming' as Id<'races'>,
      round: 2,
      name: 'Saudi Arabian Grand Prix',
      slug: 'saudi-2026',
      status: 'upcoming',
    }),
    isNext: false,
    predictionOpenAt: now + 14 * day,
  },
  {
    label: 'Sprint weekend (next up)',
    race: mockRace({
      _id: 'sprint' as Id<'races'>,
      round: 6,
      name: 'Miami Grand Prix',
      slug: 'miami-2026',
      status: 'upcoming',
      hasSprint: true,
      sprintQualiStartAt: now + 5 * day,
      sprintStartAt: now + 6 * day,
      qualiStartAt: now + 6 * day + 4 * 60 * 60 * 1000,
      raceStartAt: now + 7 * day,
    }),
    isNext: true,
    predictionOpenAt: null,
  },
  {
    label: 'Locked (race in …)',
    race: mockRace({
      _id: 'locked-future' as Id<'races'>,
      round: 3,
      name: 'Australian Grand Prix',
      slug: 'australia-2026',
      status: 'locked',
      raceStartAt: now + 2 * day,
    }),
    isNext: false,
    predictionOpenAt: null,
  },
  {
    label: 'Locked (results pending)',
    race: mockRace({
      _id: 'locked' as Id<'races'>,
      round: 4,
      name: 'Japanese Grand Prix',
      slug: 'japan-2026',
      status: 'locked',
      raceStartAt: now - 2 * day,
    }),
    isNext: false,
    predictionOpenAt: null,
  },
  {
    label: 'Finished',
    race: mockRace({
      _id: 'finished' as Id<'races'>,
      round: 5,
      name: 'Monaco Grand Prix',
      slug: 'monaco-2026',
      status: 'finished',
      raceStartAt: now - 14 * day,
    }),
    isNext: false,
    predictionOpenAt: null,
  },
] as const;

export const AllStates: Story = {
  render: () => (
    <StorybookRouter>
      <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2">
        {ALL_STATES.map(({ label, race, isNext, predictionOpenAt }) => (
          <div key={race._id} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text-muted">{label}</p>
            <RaceCard
              race={race}
              isNext={isNext}
              predictionOpenAt={predictionOpenAt ?? undefined}
            />
          </div>
        ))}
      </div>
    </StorybookRouter>
  ),
};

/** Responsive showcase: largest to smallest (top to bottom). */
const VIEWPORTS = [
  { label: 'Large (768px)', width: 768 },
  { label: 'Desktop (480px)', width: 480 },
  { label: 'Mobile (375px)', width: 375 },
] as const;

export const DesktopVsMobile: Story = {
  args: {
    race: mockRace({ status: 'upcoming' }),
    isNext: true,
    predictionOpenAt: null,
  },
  decorators: [
    (Story, context) => (
      <div className="flex flex-col gap-8 p-4">
        {VIEWPORTS.map(({ label, width }) => (
          <div key={width} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text-muted">{label}</p>
            <div
              className="rounded-lg border border-border bg-page/50 p-4"
              style={{ width }}
            >
              <Story {...context} />
            </div>
          </div>
        ))}
      </div>
    ),
  ],
};
