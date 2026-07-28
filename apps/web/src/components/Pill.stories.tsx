import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from './Badge';
import { Pill } from './Pill';
import type { PillSize, PillTone } from './Pill';

const meta = {
  title: 'Components/Pill',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const TONES: PillTone[] = ['neutral', 'accent', 'success', 'warning'];
const SIZES: PillSize[] = ['sm', 'md', 'lg'];

/**
 * The tone recipes exist because nine call sites each picked their own
 * opacities for the same intent (`accent/35` in one place, `accent/45` in
 * another). Pick a tone, never a colour.
 */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {TONES.map((tone) => (
        <div key={tone} className="flex items-center gap-4">
          <code className="w-20 shrink-0 text-xs text-text-muted">{tone}</code>
          <Pill tone={tone}>Predictions locked</Pill>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {SIZES.map((size) => (
        <div key={size} className="flex items-center gap-4">
          <code className="w-20 shrink-0 text-xs text-text-muted">{size}</code>
          <Pill tone="accent" size={size}>
            Live
          </Pill>
        </div>
      ))}
    </div>
  ),
};

/**
 * `Badge` is the layer above: named domain states that carry their own icon and
 * copy. Reach for `Pill` only when the label is caller-supplied.
 */
export const AgainstBadge: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <code className="w-28 shrink-0 text-xs text-text-muted">Badge</code>
        <Badge variant="locked" />
        <Badge variant="submitted" />
        <Badge variant="sprint">SPRINT</Badge>
      </div>
      <div className="flex items-center gap-3">
        <code className="w-28 shrink-0 text-xs text-text-muted">Pill</code>
        <Pill tone="warning">Closing soon</Pill>
        <Pill tone="success">Picks submitted</Pill>
        <Pill>12 Aug</Pill>
      </div>
    </div>
  ),
};

/** In context: the metadata row on a race card. */
export const InARow: Story = {
  render: () => (
    <div className="flex max-w-md flex-wrap items-center gap-1 rounded-xl border border-border bg-surface p-3">
      <Badge variant="sprint">SPRINT</Badge>
      <Pill tone="warning" className="tabular-nums">
        02h 14m until lock
      </Pill>
      <Pill>Opens 12 August</Pill>
    </div>
  ),
};
