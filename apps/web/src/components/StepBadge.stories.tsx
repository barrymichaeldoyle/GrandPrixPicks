import type { Meta, StoryObj } from '@storybook/react';

import { StepBadge } from './StepBadge';

const meta = {
  title: 'Components/StepBadge',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Always a tick, never a number: accent-filled once the step is done, muted
 * outline while it is outstanding.
 */
export const States: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <StepBadge step={1} done />
        <div className="mt-2 text-xs text-text-muted">done</div>
      </div>
      <div className="text-center">
        <StepBadge step={2} done={false} />
        <div className="mt-2 text-xs text-text-muted">not done</div>
      </div>
    </div>
  ),
};

/** In context: the two-step per-session picks flow. */
export const PicksFlow: Story = {
  render: () => (
    <div className="w-80 space-y-3">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
        <StepBadge step={1} done />
        <div className="text-sm">
          <div className="font-semibold text-text">Top 5</div>
          <div className="text-xs text-text-muted">Submitted</div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
        <StepBadge step={2} done={false} />
        <div className="text-sm">
          <div className="font-semibold text-text">Head to head</div>
          <div className="text-xs text-text-muted">11 matchups to pick</div>
        </div>
      </div>
    </div>
  ),
};
