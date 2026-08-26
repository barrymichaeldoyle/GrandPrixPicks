import type { Meta, StoryObj } from '@storybook/react';

import { ViewerSessionProvider } from '@/integrations/clerk/viewer-session-context';
import { railDecorator } from '@/storybook/railDecorator';
import { RailFooterLinks } from './RailFooterLinks';

const meta = {
  title: 'Dashboard/Rail/RailFooterLinks',
  component: RailFooterLinks,
  decorators: [
    // It renders nothing unless the viewer is signed in on `/`, which is the
    // one page whose rail owns the small print instead of the global footer.
    (Story) => (
      <ViewerSessionProvider
        value={{ isSignedIn: true, confirmedSignedIn: true, isLoaded: true }}
      >
        <Story />
      </ViewerSessionProvider>
    ),
    ...railDecorator,
  ],
} satisfies Meta<typeof RailFooterLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Sized to WCAG 2.2 AA (24x24 CSS px) rather than the 44px the rest of the
 * dashboard uses, on every pointer type. See the component for why.
 */
export const Default: Story = {};
