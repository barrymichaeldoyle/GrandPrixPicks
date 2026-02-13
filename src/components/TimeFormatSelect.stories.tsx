import type { Meta, StoryObj } from '@storybook/react';

import { TimeFormatSelect } from './TimeFormatSelect';

const meta: Meta<typeof TimeFormatSelect> = {
  title: 'Settings/TimeFormatSelect',
  component: TimeFormatSelect,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof TimeFormatSelect>;

export const Default: Story = {
  args: {
    timezone: 'America/New_York',
    onChange: (locale) => console.log('Selected:', locale),
  },
};

export const TwelveHour: Story = {
  args: {
    value: 'en-US',
    timezone: 'America/New_York',
    onChange: (locale) => console.log('Selected:', locale),
  },
};

export const TwentyFourHour: Story = {
  args: {
    value: 'en-GB',
    timezone: 'Europe/London',
    onChange: (locale) => console.log('Selected:', locale),
  },
};

export const UsingBrowserDefault: Story = {
  args: {
    value: undefined,
    timezone: 'UTC',
    onChange: (locale) => console.log('Selected:', locale),
  },
};
