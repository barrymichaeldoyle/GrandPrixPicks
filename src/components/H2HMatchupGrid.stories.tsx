import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import type { Id } from '../../convex/_generated/dataModel';
import { H2HMatchupGrid } from './H2HMatchupGrid';

const matchups = [
  {
    _id: 'mclaren' as Id<'h2hMatchups'>,
    team: 'McLaren',
    driver1: {
      _id: 'nor' as Id<'drivers'>,
      code: 'NOR',
      displayName: 'Lando Norris',
      number: 4,
      nationality: 'GB',
    },
    driver2: {
      _id: 'pia' as Id<'drivers'>,
      code: 'PIA',
      displayName: 'Oscar Piastri',
      number: 81,
      nationality: 'AU',
    },
  },
  {
    _id: 'ferrari' as Id<'h2hMatchups'>,
    team: 'Ferrari',
    driver1: {
      _id: 'lec' as Id<'drivers'>,
      code: 'LEC',
      displayName: 'Charles Leclerc',
      number: 16,
      nationality: 'MC',
    },
    driver2: {
      _id: 'ham' as Id<'drivers'>,
      code: 'HAM',
      displayName: 'Lewis Hamilton',
      number: 44,
      nationality: 'GB',
    },
  },
  {
    _id: 'mercedes' as Id<'h2hMatchups'>,
    team: 'Mercedes',
    driver1: {
      _id: 'rus' as Id<'drivers'>,
      code: 'RUS',
      displayName: 'George Russell',
      number: 63,
      nationality: 'GB',
    },
    driver2: {
      _id: 'ant' as Id<'drivers'>,
      code: 'ANT',
      displayName: 'Kimi Antonelli',
      number: 12,
      nationality: 'IT',
    },
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
        mclaren: 'pia' as Id<'drivers'>,
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
          mclaren: 'nor' as Id<'drivers'>,
          ferrari: 'ham' as Id<'drivers'>,
        }}
      />
    </div>
  ),
};
