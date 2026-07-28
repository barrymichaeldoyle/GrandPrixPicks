import type { Meta, StoryObj } from '@storybook/react';

import { UpcomingPredictionNudge } from './UpcomingPredictionNudge';

const meta = {
  title: 'Components/Upcoming Prediction Nudge',
  component: UpcomingPredictionNudge,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [(Story) => <Story />],
  args: {
    raceName: 'Miami Grand Prix',
    raceSlug: 'miami-2026',
  },
} satisfies Meta<typeof UpcomingPredictionNudge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SubmitH2H: Story = {
  args: {
    ctaLabel: 'Submit H2H',
  },
};

export const Dismissible: Story = {
  args: {
    onDismiss: () => {
      // Storybook-only stub
    },
  },
};
