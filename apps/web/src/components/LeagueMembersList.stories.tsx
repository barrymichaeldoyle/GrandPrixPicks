import type { Meta, StoryObj } from '@storybook/react';
import type { PropsWithChildren } from 'react';

import type { LeagueMembersListItem } from './LeagueMembersList';
import { LeagueMembersList } from './LeagueMembersList';

function storyLink({
  username,
  className,
  children,
}: PropsWithChildren<{ username: string; className?: string }>) {
  return (
    <a href={`/p/${username}`} className={className}>
      {children}
    </a>
  );
}

const meta = {
  title: 'Components/LeagueMembersList',
  component: LeagueMembersList,
  parameters: {
    layout: 'padded',
  },
  args: {
    members: [],
    showPredictionStatus: true,
    renderProfileLink: storyLink,
  },
} satisfies Meta<typeof LeagueMembersList>;

export default meta;
type Story = StoryObj<typeof meta>;

const base: LeagueMembersListItem[] = [
  {
    _id: '1',
    userId: 'u1',
    username: 'alex-smith',
    displayName: 'Alex Smith',
    avatarUrl: 'https://i.pravatar.cc/150?u=alex-smith',
    role: 'admin',
    isViewer: true,
    isFollowing: undefined,
    top5Picked: true,
    h2hPicked: true,
  },
  {
    _id: '2',
    userId: 'u2',
    username: 'emma-jones',
    displayName: 'Emma Jones',
    avatarUrl: 'https://i.pravatar.cc/150?u=emma-jones',
    role: 'admin',
    isViewer: false,
    isFollowing: true,
    top5Picked: true,
    h2hPicked: true,
  },
  {
    _id: '3',
    userId: 'u3',
    username: 'liam-brown',
    displayName: 'Liam Brown',
    role: 'member',
    isViewer: false,
    isFollowing: false,
    top5Picked: true,
    h2hPicked: false,
  },
  {
    _id: '4',
    userId: 'u4',
    username: 'olivia-taylor',
    displayName: 'Olivia Taylor',
    avatarUrl: 'https://i.pravatar.cc/150?u=olivia-taylor',
    role: 'member',
    isViewer: false,
    isFollowing: false,
    top5Picked: false,
    h2hPicked: false,
  },
  {
    _id: '5',
    userId: 'u5',
    username: 'noah-davis',
    displayName: 'Noah Davis',
    role: 'member',
    isViewer: false,
    isFollowing: true,
    top5Picked: true,
    h2hPicked: true,
  },
  {
    _id: '6',
    userId: 'u6',
    username: 'sophia-wilson',
    displayName: 'Sophia Wilson',
    avatarUrl: 'https://i.pravatar.cc/150?u=sophia-wilson',
    role: 'member',
    isViewer: false,
    isFollowing: false,
    top5Picked: true,
    h2hPicked: true,
  },
];

export const WithPredictionStatus: Story = {
  render: () => (
    <div className="mx-auto max-w-sm">
      <p className="mb-2 text-xs text-text-muted">
        Predictions are hidden until this race locks
      </p>
      <LeagueMembersList
        members={base}
        showPredictionStatus={true}
        renderProfileLink={storyLink}
      />
    </div>
  ),
};

export const NoPredictionStatus: Story = {
  render: () => (
    <div className="mx-auto max-w-sm">
      <LeagueMembersList
        members={base}
        showPredictionStatus={false}
        renderProfileLink={storyLink}
      />
    </div>
  ),
};

export const Wide: Story = {
  render: () => (
    <div className="mx-auto max-w-2xl">
      <LeagueMembersList
        members={base}
        showPredictionStatus={true}
        renderProfileLink={storyLink}
      />
    </div>
  ),
};
