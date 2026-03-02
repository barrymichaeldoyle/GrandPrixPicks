import type { Meta, StoryObj } from '@storybook/react';

import { StorybookRouter } from '@/stories/router-decorator';

import { CookieConsent } from './CookieConsent';
import { Footer } from './Footer';

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

export const WithFooterCompensation: Story = {
  render: (args) => (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-3 text-xl font-semibold text-text">
          Content preview
        </h2>
        <p className="mb-4 text-text-muted">
          This story mirrors the app shell with page content, footer, and cookie
          banner visible at the same time.
        </p>
        <div className="space-y-3 text-sm text-text-muted">
          <p>
            Scroll to the bottom and confirm footer content remains visible.
          </p>
          <p>
            Footer bottom padding should grow while the banner is mounted and
            reset when dismissed.
          </p>
          <p className="pb-20">
            Spacer content to create realistic page depth for overlap checks.
          </p>
        </div>
      </div>
      <Footer />
      <CookieConsent {...args} />
    </div>
  ),
};
