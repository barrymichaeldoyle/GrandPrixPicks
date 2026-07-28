import type { Meta, StoryObj } from '@storybook/react';
import { Info } from 'lucide-react';

import { Tooltip } from './Tooltip';

const meta = {
  title: 'Components/Tooltip',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function trigger(label: string) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
      <Info size={14} className="text-accent" aria-hidden />
      {label}
    </span>
  );
}

/** Hover (or focus) the triggers. The tooltip renders in a portal. */
export const Placements: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-16 py-16">
      <Tooltip content="Shown above the trigger" placement="top">
        {trigger('placement="top"')}
      </Tooltip>
      <Tooltip content="Shown below the trigger" placement="bottom">
        {trigger('placement="bottom"')}
      </Tooltip>
    </div>
  ),
};

/** Content can be a node, not just a string, for richer explanations. */
export const RichContent: Story = {
  render: () => (
    <div className="py-16">
      <Tooltip
        content={
          <div className="max-w-56 text-left">
            <div className="mb-1 font-semibold text-text">Scoring</div>
            <ul className="space-y-0.5 text-text-muted">
              <li>5 pts: exact position</li>
              <li>3 pts: off by one</li>
              <li>1 pt: in the top 5</li>
            </ul>
          </div>
        }
      >
        {trigger('How scoring works')}
      </Tooltip>
    </div>
  ),
};

/** Tap-friendly mode for touch targets where hover does not exist. */
export const OpenOnClick: Story = {
  render: () => (
    <div className="py-16">
      <Tooltip content="Opened by click or tap" openOnClick>
        {trigger('openOnClick')}
      </Tooltip>
    </div>
  ),
};

/** Near a viewport edge the tooltip is constrained to stay fully visible. */
export const EdgeConstrained: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="flex justify-between px-2 py-20">
      <Tooltip content="Pinned away from the left edge">
        {trigger('left edge')}
      </Tooltip>
      <Tooltip content="Pinned away from the right edge">
        {trigger('right edge')}
      </Tooltip>
    </div>
  ),
};
