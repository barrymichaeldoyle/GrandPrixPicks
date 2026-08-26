import type { Meta, StoryObj } from '@storybook/react';

import { railDecorator } from '@/storybook/railDecorator';
import { QuickLinksCard } from './QuickLinksCard';

const meta = {
  title: 'Dashboard/Rail/QuickLinksCard',
  component: QuickLinksCard,
  decorators: railDecorator,
} satisfies Meta<typeof QuickLinksCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Two groups split by a rule: game destinations, then the real-F1 reference
 * pages. Nothing here repeats a header tab.
 */
export const Default: Story = {};
