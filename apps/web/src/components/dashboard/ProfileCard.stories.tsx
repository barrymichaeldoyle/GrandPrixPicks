import type { Meta, StoryObj } from '@storybook/react';

import { fakeId } from '@/storybook/fixtures';
import { railDecorator } from '@/storybook/railDecorator';
import { ProfileCard } from './ProfileCard';

type Me = Parameters<typeof ProfileCard>[0]['me'];

function me(overrides: { username: string; displayName?: string }) {
  return {
    _id: fakeId<'users'>(overrides.username),
    username: overrides.username,
    displayName: overrides.displayName,
    avatarUrl: undefined,
  } as unknown as Me;
}

const meta = {
  title: 'Dashboard/Rail/ProfileCard',
  component: ProfileCard,
  decorators: railDecorator,
} satisfies Meta<typeof ProfileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { me: me({ username: 'barry', displayName: 'Barry Doyle' }) },
};

/** No display name set: the username carries both lines. */
export const UsernameOnly: Story = { args: { me: me({ username: 'barry' }) } };

/**
 * The rail leaves roughly 140px for text. A three-word name only fits once it
 * wraps, and the username below never wraps because it cannot break.
 */
export const LongName: Story = {
  args: {
    me: me({
      username: 'maximilianverstappen',
      displayName: 'Maximilian Emilian Verstappen',
    }),
  },
};

export const Loading: Story = { args: { me: undefined } };
