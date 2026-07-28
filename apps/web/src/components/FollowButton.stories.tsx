import { api } from '@convex-generated/api';
import type { Meta, StoryObj } from '@storybook/react';

import { fakeId } from '@/storybook/fixtures';
import {
  buildStorybookConvexMocks,
  StorybookMockProviders,
} from '@/storybook/mockAppRuntime';
import { FollowButton } from './FollowButton';

const followeeId = fakeId<'users'>('user-lewis');

function mocks(isFollowing: boolean) {
  return buildStorybookConvexMocks({
    queries: [[api.follows.isFollowing, isFollowing]],
    mutations: [
      [api.follows.follow, async () => null],
      [api.follows.unfollow, async () => null],
    ],
  });
}

const meta = {
  title: 'Components/FollowButton',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Fetches its own follow state. Hover the following state to see it offer to unfollow. */
export const FetchesItsOwnState: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <StorybookMockProviders
          auth={{ isLoaded: true, isSignedIn: true }}
          convex={mocks(false)}
        >
          <FollowButton followeeId={followeeId} />
        </StorybookMockProviders>
        <div className="mt-2 text-xs text-text-muted">not following</div>
      </div>
      <div className="text-center">
        <StorybookMockProviders
          auth={{ isLoaded: true, isSignedIn: true }}
          convex={mocks(true)}
        >
          <FollowButton followeeId={followeeId} />
        </StorybookMockProviders>
        <div className="mt-2 text-xs text-text-muted">following (hover me)</div>
      </div>
    </div>
  ),
};

/**
 * Feed rows already know the follow state, so they pass `isFollowing` and the
 * button skips its query. Without this the feed would fire one query per row,
 * which is why a second, divergent follow button used to exist inside FeedItem.
 * There are no query mocks here at all: if the button still queried, it would
 * render nothing.
 */
export const StateSuppliedByCaller: Story = {
  render: () => (
    <StorybookMockProviders
      auth={{ isLoaded: true, isSignedIn: true }}
      convex={buildStorybookConvexMocks({
        queries: [],
        mutations: [
          [api.follows.follow, async () => null],
          [api.follows.unfollow, async () => null],
        ],
      })}
    >
      <div className="flex items-center gap-6">
        <FollowButton
          followeeId={followeeId}
          isFollowing={false}
          source="feed_item"
        />
        <FollowButton followeeId={followeeId} isFollowing source="feed_item" />
      </div>
    </StorybookMockProviders>
  ),
};
