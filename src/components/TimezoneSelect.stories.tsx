import type { Meta, StoryObj } from '@storybook/react';

import { TimezoneSelect } from './TimezoneSelect';

const meta: Meta<typeof TimezoneSelect> = {
  title: 'Settings/TimezoneSelect',
  component: TimezoneSelect,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof TimezoneSelect>;

export const Default: Story = {
  args: {
    onChange: (tz) => console.log('Selected:', tz),
  },
};

export const CustomValue: Story = {
  args: {
    value: 'America/New_York',
    onChange: (tz) => console.log('Selected:', tz),
  },
};

export const UsingBrowserDefault: Story = {
  args: {
    value: undefined,
    onChange: (tz) => console.log('Selected:', tz),
  },
};
