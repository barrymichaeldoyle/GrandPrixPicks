import type { Meta, StoryObj } from '@storybook/react';

import { StorybookRouter } from '@/stories/router-decorator';

import { CookieConsent } from './CookieConsent';

const meta = {
  title: 'Components/Cookie Consent',
  component: CookieConsent,
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
    forceVisible: true,
  },
} satisfies Meta<typeof CookieConsent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Banner: Story = {
  render: (args) => (
    <div className="min-h-screen bg-page pb-28">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-text-muted">
          Preview area for the app content behind the cookie banner.
        </p>
      </div>
      <CookieConsent {...args} />
    </div>
  ),
};

export const HiddenAfterDecision: Story = {
  args: {
    forceVisible: false,
  },
  render: (args) => (
    <div className="min-h-screen bg-page pb-28">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-text-muted">
          Banner is hidden when consent has already been decided.
        </p>
      </div>
      <CookieConsent {...args} />
    </div>
  ),
};
