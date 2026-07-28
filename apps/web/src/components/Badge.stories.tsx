import type { Meta, StoryObj } from '@storybook/react';

import { Badge, StatusBadge } from './Badge';

const meta = {
  title: 'Components/Badge',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const VARIANTS = [
  'sprint',
  'upcoming',
  'not_yet_open',
  'locked',
  'submitted',
  'finished',
  'cancelled',
] as const;

/** Every variant side by side. Status variants supply their own icon and label. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex items-center gap-4">
          <code className="w-32 shrink-0 text-xs text-text-muted">
            {variant}
          </code>
          <Badge variant={variant}>
            {variant === 'sprint'
              ? 'SPRINT'
              : variant === 'cancelled'
                ? 'Called Off'
                : undefined}
          </Badge>
        </div>
      ))}
    </div>
  ),
};

/**
 * The sprint badge is the one variant with its own colour, so it is worth
 * seeing against both surfaces it appears on.
 */
export const Sprint: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg bg-page p-4">
        <span className="text-xs text-text-muted">on page</span>
        <Badge variant="sprint">SPRINT</Badge>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-surface p-4">
        <span className="text-xs text-text-muted">on surface</span>
        <Badge variant="sprint">SPRINT</Badge>
      </div>
    </div>
  ),
};

/** StatusBadge maps a Convex race status onto the right variant. */
export const FromRaceStatus: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(
        [
          ['upcoming', true, 'next race, open'],
          ['upcoming', false, 'later race, not open'],
          ['locked', undefined, 'session started'],
          ['finished', undefined, 'results published'],
          ['cancelled', undefined, 'called off'],
        ] as const
      ).map(([status, isNext, note]) => (
        <div
          key={`${status}-${String(isNext)}`}
          className="flex items-center gap-4"
        >
          <code className="w-44 shrink-0 text-xs text-text-muted">{note}</code>
          <StatusBadge status={status} isNext={isNext} />
        </div>
      ))}
    </div>
  ),
};
