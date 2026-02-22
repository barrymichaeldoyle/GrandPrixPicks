import type { Meta, StoryObj } from '@storybook/react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { StorybookRouter } from '@/stories/router-decorator';

import { Button } from './Button';
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
  },
} satisfies Meta<typeof UpcomingPredictionNudge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    makePicksControl: (
      <Button asChild size="sm" rightIcon={ArrowRight}>
        <Link to="/races/$raceSlug" params={{ raceSlug: 'miami-2026' }}>
          Make picks
        </Link>
      </Button>
    ),
  },
};

export const Randomizing: Story = {
  args: {
    isRandomizing: true,
    makePicksControl: (
      <Button asChild size="sm" rightIcon={ArrowRight}>
        <Link to="/races/$raceSlug" params={{ raceSlug: 'miami-2026' }}>
          Make picks
        </Link>
      </Button>
    ),
  },
};

export const WithError: Story = {
  args: {
    error: 'Predictions are only open for the next upcoming race.',
    makePicksControl: (
      <Button asChild size="sm" rightIcon={ArrowRight}>
        <Link to="/races/$raceSlug" params={{ raceSlug: 'miami-2026' }}>
          Make picks
        </Link>
      </Button>
    ),
  },
};
