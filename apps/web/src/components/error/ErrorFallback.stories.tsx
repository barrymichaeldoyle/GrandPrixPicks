import type { Meta, StoryObj } from '@storybook/react';

import { ErrorFallback } from './ErrorFallback';

const meta = {
  title: 'Components/ErrorFallback',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Sentry reporting is off in every story: Storybook is a preview surface, not a
 * source of production error events.
 */
export const Default: Story = {
  render: () => (
    <ErrorFallback
      error={new Error('Server Error\nRequest ID: 8f2c1e')}
      reportToSentry={false}
    />
  ),
};

/**
 * The copy is fixed, so a completely different failure renders identically. The
 * error itself only reaches Sentry and the dev-only details block.
 */
export const DifferentError: Story = {
  render: () => (
    <ErrorFallback
      error={new Error('Not authenticated')}
      reportToSentry={false}
    />
  ),
};
