import type { Meta, StoryObj } from '@storybook/react';
import type { PropsWithChildren } from 'react';

import type { LeagueMembersListItem } from './LeagueMembersList';
import { LeagueMembersList } from './LeagueMembersList';
import { mockOtherUsers, mockViewer } from '../storybook/fixtures';

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
    _id: 'lm-1',
    userId: mockViewer._id,
    username: mockViewer.username,
    displayName: mockViewer.displayName ?? mockViewer.username,
    avatarUrl: mockViewer.avatarUrl,
    role: 'admin',
    isViewer: true,
    isFollowing: undefined,
    top5Picked: true,
    h2hPicked: true,
  },
  {
    _id: 'lm-2',
    userId: mockOtherUsers[0]!._id,
    username: mockOtherUsers[0]!.username,
    displayName: mockOtherUsers[0]!.displayName ?? mockOtherUsers[0]!.username,
    avatarUrl: mockOtherUsers[0]!.avatarUrl,
    role: 'admin',
    isViewer: false,
    isFollowing: true,
    top5Picked: true,
    h2hPicked: true,
  },
  {
    _id: 'lm-3',
    userId: mockOtherUsers[1]!._id,
    username: mockOtherUsers[1]!.username,
    displayName: mockOtherUsers[1]!.displayName ?? mockOtherUsers[1]!.username,
    role: 'member',
    isViewer: false,
    isFollowing: false,
    top5Picked: true,
    h2hPicked: false,
  },
  {
    _id: 'lm-4',
    userId: mockOtherUsers[2]!._id,
    username: mockOtherUsers[2]!.username,
    displayName: mockOtherUsers[2]!.displayName ?? mockOtherUsers[2]!.username,
    avatarUrl: mockOtherUsers[2]!.avatarUrl,
    role: 'member',
    isViewer: false,
    isFollowing: false,
    top5Picked: false,
    h2hPicked: false,
  },
  {
    _id: 'lm-5',
    userId: mockOtherUsers[3]!._id,
    username: mockOtherUsers[3]!.username,
    displayName: mockOtherUsers[3]!.displayName ?? mockOtherUsers[3]!.username,
    avatarUrl: mockOtherUsers[3]!.avatarUrl,
    role: 'member',
    isViewer: false,
    isFollowing: true,
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
