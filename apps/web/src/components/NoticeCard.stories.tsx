import type { Meta, StoryObj } from '@storybook/react';
import { LogIn, Shield, Trophy, Users } from 'lucide-react';

import { Button } from './Button/Button';
import { NoticeCard } from './NoticeCard';

const meta = {
  title: 'Components/NoticeCard',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Route-level: renders an h1 because it is the only heading on the page. */
export const PageGate: Story = {
  render: () => (
    <div className="mx-auto max-w-4xl">
      <NoticeCard
        level="page"
        icon={LogIn}
        title="Sign In Required"
        description="Sign in to view your prediction history."
        action={<Button size="sm">Sign In</Button>}
      />
    </div>
  ),
};

export const NotFound: Story = {
  render: () => (
    <div className="mx-auto max-w-4xl">
      <NoticeCard
        level="page"
        icon={Shield}
        title="League Not Found"
        description="This league doesn't exist or may have been deleted."
        action={<Button size="sm">Back to Leagues</Button>}
      />
    </div>
  ),
};

/** Inside a page that already has a heading, so it renders an h2 one size down. */
export const SectionEmptyState: Story = {
  render: () => (
    <div className="mx-auto max-w-4xl">
      <NoticeCard
        icon={Trophy}
        title="No scores yet"
        description="The leaderboard will populate once race results are published."
      />
    </div>
  ),
};

/** The action slot takes any node, including a secondary line of copy. */
export const WithSecondaryCopy: Story = {
  render: () => (
    <div className="mx-auto max-w-4xl">
      <NoticeCard
        icon={Users}
        title="No one here yet"
        description="Follow other players from their profile to see them on this leaderboard."
        action={
          <p className="text-sm text-text-muted">
            Browse the global leaderboard to find players to follow.
          </p>
        }
      />
    </div>
  ),
};

/** Icon is optional: some gates are pure copy. */
export const NoIcon: Story = {
  render: () => (
    <div className="mx-auto max-w-4xl">
      <NoticeCard
        level="page"
        title="Set a Username"
        description="You need a username to view your predictions."
        action={<Button size="sm">Go to Settings</Button>}
      />
    </div>
  ),
};
