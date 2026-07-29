import type { Meta, StoryObj } from '@storybook/react';

import { Avatar } from './Avatar';

const meta = {
  title: 'Components/Avatar',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const SIZES = ['xs', 'sm', 'md', 'lg'] as const;

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {SIZES.map((size) => (
        <div key={size} className="text-center">
          <Avatar username="barry" size={size} />
          <div className="mt-2 text-xs text-text-muted">{size}</div>
        </div>
      ))}
    </div>
  ),
};

/**
 * With no avatar URL the initial is shown on a colour picked by hashing the
 * username, so the same person keeps the same colour everywhere.
 */
export const InitialFallback: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {[
        'barry',
        'lewis',
        'max',
        'charles',
        'lando',
        'oscar',
        'george',
        'carlos',
        'fernando',
        'yuki',
      ].map((username) => (
        <div key={username} className="text-center">
          <Avatar username={username} />
          <div className="mt-1 text-xs text-text-muted">{username}</div>
        </div>
      ))}
    </div>
  ),
};

/** Missing username falls back to "?" rather than rendering an empty circle. */
export const NoUsername: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <Avatar username={null} />
      <Avatar username={undefined} />
      <Avatar username="" />
    </div>
  ),
};
