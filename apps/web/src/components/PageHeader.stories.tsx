import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button/Button';
import { PageHeader } from './PageHeader';

const meta = {
  title: 'Components/PageHeader',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Deliberately flat: the page idiom is sections separated by hairline rules on
 * the page background, not a card stacked on more cards.
 */
export const Full: Story = {
  render: () => (
    <PageHeader
      eyebrow="Game guide"
      title="How scoring works"
      subtitle="Pick five drivers per session. Points depend on how close each pick lands to the driver's actual finishing position, so order matters as much as who you back."
      actions={<Button>Make your picks</Button>}
    />
  ),
};

export const TitleOnly: Story = {
  render: () => <PageHeader title="Leaderboard" />,
};

export const WithEyebrow: Story = {
  render: () => (
    <PageHeader
      eyebrow="Legal"
      title="Privacy policy"
      subtitle="What we collect, why we collect it, and how to get it deleted."
    />
  ),
};

/** A long title should wrap without the eyebrow or copy losing alignment. */
export const LongTitle: Story = {
  render: () => (
    <PageHeader
      eyebrow="Season pass"
      title="Everything included with a Grand Prix Picks season pass"
      subtitle="One payment covers the whole season."
    />
  ),
};
