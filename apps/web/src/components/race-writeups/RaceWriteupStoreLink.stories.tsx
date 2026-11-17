import type { Meta, StoryObj } from '@storybook/react-vite';

import { RaceWriteupStoreCard } from './RaceWriteupStoreLink';

const meta = {
  title: 'Race write-ups/RaceWriteupStoreCard',
  component: RaceWriteupStoreCard,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="bg-page p-6">
        <div className="grid max-w-5xl gap-1 sm:grid-cols-2">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof RaceWriteupStoreCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One cell of the weekend news grid, with no race merch to show. */
export const Generic: Story = {};

/** Both columns, closing a grid that would otherwise end half empty. */
export const Wide: Story = { args: { wide: true } };
