import type { Id } from '@convex-generated/dataModel';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { H2HMatchupGrid } from './H2HMatchupGrid';
import { fakeId, mockDrivers } from '@/storybook/fixtures';

const matchups = [
  {
    _id: fakeId<'h2hMatchups'>('matchup-mclaren'),
    team: 'McLaren',
    driver1: mockDrivers.NOR,
    driver2: mockDrivers.PIA,
  },
  {
    _id: fakeId<'h2hMatchups'>('matchup-ferrari'),
    team: 'Ferrari',
    driver1: mockDrivers.LEC,
    driver2: mockDrivers.HAM,
  },
  {
    _id: fakeId<'h2hMatchups'>('matchup-mercedes'),
    team: 'Mercedes',
    driver1: mockDrivers.RUS,
    driver2: mockDrivers.ANT,
  },
] as const;

const meta = {
  title: 'Components/H2HMatchupGrid',
  component: H2HMatchupGrid,
  parameters: {
    layout: 'padded',
  },
  args: {
    matchups: [...matchups],
    selections: {},
  },
} satisfies Meta<typeof H2HMatchupGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => {
    const [selections, setSelections] = useState<Record<string, Id<'drivers'>>>(
      {
        [matchups[0]._id]: mockDrivers.PIA._id,
      },
    );

    return (
      <div className="mx-auto max-w-6xl pb-10">
        <H2HMatchupGrid
          matchups={[...matchups]}
          selections={selections}
          mode="interactive"
          onSelect={(matchupId, driverId) =>
            setSelections((prev) => ({ ...prev, [matchupId]: driverId }))
          }
        />
      </div>
    );
  },
};

export const ReadOnly: Story = {
  render: () => (
    <div className="mx-auto max-w-6xl pb-10">
      <H2HMatchupGrid
        matchups={[...matchups]}
        mode="readonly"
        selections={{
          [matchups[0]._id]: mockDrivers.NOR._id,
          [matchups[1]._id]: mockDrivers.HAM._id,
        }}
      />
    </div>
  ),
};
