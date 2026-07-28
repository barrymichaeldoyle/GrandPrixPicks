import type { Meta, StoryObj } from '@storybook/react';

import { ScoreRing } from './ScoreRing';

const meta = {
  title: 'Components/ScoreRing',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A session is scored out of 25 (5 picks x 5 points). */
export const ScoreRange: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      {[0, 3, 9, 15, 21, 25].map((earned) => (
        <div key={earned} className="text-center">
          <ScoreRing earned={earned} max={25} />
          <div className="mt-2 text-xs text-text-muted">{earned} / 25</div>
        </div>
      ))}
    </div>
  ),
};

/**
 * Before results are published there is nothing to fill: the track goes dashed
 * and the centre shows the empty label instead of a number.
 */
export const NotYetScored: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <ScoreRing earned={0} max={0} />
        <div className="mt-2 text-xs text-text-muted">default</div>
      </div>
      <div className="text-center">
        <ScoreRing earned={0} max={0} emptyLabel="TBD" />
        <div className="mt-2 text-xs text-text-muted">emptyLabel="TBD"</div>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {[32, 48, 64, 96].map((size) => (
        <div key={size} className="text-center">
          <ScoreRing earned={18} max={25} size={size} />
          <div className="mt-2 text-xs text-text-muted">{size}px</div>
        </div>
      ))}
    </div>
  ),
};
