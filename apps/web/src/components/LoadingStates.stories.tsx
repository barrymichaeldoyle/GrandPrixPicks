import type { Meta, StoryObj } from '@storybook/react';

import { InlineLoader } from './InlineLoader';
import { PageLoader } from './PageLoader';
import { RaceCardSkeleton } from './RaceCardSkeleton';

/**
 * The three loading affordances, together, because the choice between them is
 * the design decision: a skeleton where the shape is known, a spinner where it
 * is not.
 */
const meta = {
  title: 'Components/Loading states',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Section-level: a query resolving inside an already-rendered page. */
export const Inline: Story = {
  render: () => (
    <div className="rounded-xl border border-border bg-surface">
      <InlineLoader />
    </div>
  ),
};

/** Route-level: nothing on screen yet, so it owns the viewport. */
export const FullPage: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <PageLoader />,
};

/**
 * Preferred over a spinner wherever the final layout is known, since it holds
 * the space and avoids a jump when data lands.
 */
export const RaceCards: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
      <RaceCardSkeleton isNext />
      <RaceCardSkeleton />
      <RaceCardSkeleton />
      <RaceCardSkeleton />
    </div>
  ),
};
