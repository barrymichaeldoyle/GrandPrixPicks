import type { Meta, StoryObj } from '@storybook/react';

import { StorybookRouter } from '@/stories/router-decorator';

import { UpcomingPredictionNudge } from './UpcomingPredictionNudge';

const meta = {
  title: 'Components/Upcoming Prediction Nudge',
  component: UpcomingPredictionNudge,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <StorybookRouter>
        <Story />
      </StorybookRouter>
    ),
  ],
  args: {
    raceName: 'Miami Grand Prix',
    raceSlug: 'miami-2026',
  },
} satisfies Meta<typeof UpcomingPredictionNudge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Randomizing: Story = {
  args: {
    isRandomizing: true,
  },
};

export const WithError: Story = {
  args: {
    error: 'Predictions are only open for the next upcoming race.',
  },
};
