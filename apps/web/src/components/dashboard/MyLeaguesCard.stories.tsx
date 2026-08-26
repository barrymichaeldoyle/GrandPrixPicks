import type { Meta, StoryObj } from '@storybook/react';

import { fakeId } from '@/storybook/fixtures';
import { railDecorator } from '@/storybook/railDecorator';
import { MyLeaguesCard } from './MyLeaguesCard';

type Leagues = NonNullable<Parameters<typeof MyLeaguesCard>[0]['leagues']>;

function league(name: string, memberCount: number) {
  return {
    _id: fakeId<'leagues'>(name),
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    memberCount,
  };
}

/** The card reads four fields off each league; the rest of the doc is noise. */
function leagues(...items: ReturnType<typeof league>[]) {
  return items as unknown as Leagues;
}

const meta = {
  title: 'Dashboard/Rail/MyLeaguesCard',
  component: MyLeaguesCard,
  decorators: railDecorator,
} satisfies Meta<typeof MyLeaguesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The empty state, which is the one that carries a call to action. That action
 * is a flush footer row rather than an outlined button inset by the card's own
 * padding: see `RailCardAction`.
 */
export const Empty: Story = { args: { leagues: leagues() } };

export const WithLeagues: Story = {
  args: {
    leagues: leagues(
      league('Monaco Masters', 12),
      league('Office GP', 34),
      league('Group Chat United', 6),
    ),
  },
};

/** More than three: the card shows three and defers the rest to "See all". */
export const Overflow: Story = {
  args: {
    leagues: leagues(
      league('Monaco Masters', 12),
      league('Office GP', 34),
      league('Group Chat United', 6),
      league('Sunday Drivers', 88),
    ),
  },
};

/** A league name with nowhere to wrap, which is what the truncation is for. */
export const LongLeagueName: Story = {
  args: {
    leagues: leagues(
      league('The Very Long Championship Of Extremely Keen Predictors', 4),
    ),
  },
};

export const Loading: Story = { args: { leagues: undefined } };
