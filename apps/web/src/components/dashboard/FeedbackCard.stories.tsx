import type { Meta, StoryObj } from '@storybook/react';

import { railDecorator } from '@/storybook/railDecorator';
import { FeedbackCard } from './FeedbackCard';

const meta = {
  title: 'Dashboard/Rail/FeedbackCard',
  component: FeedbackCard,
  decorators: railDecorator,
} satisfies Meta<typeof FeedbackCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The prompt. Pressing the footer row opens `FeedbackModal` over the page,
 * which is a separate story of its own.
 */
export const Default: Story = {};
