import { api } from '@convex-generated/api';
import type { Meta, StoryObj } from '@storybook/react';

import { fakeId } from '@/storybook/fixtures';
import {
  buildStorybookConvexMocks,
  StorybookMockProviders,
} from '@/storybook/mockAppRuntime';
import { SuggestedFollowsCard } from './SuggestedFollowsCard';

type Suggestion = {
  _id: ReturnType<typeof fakeId<'users'>>;
  username: string;
  displayName: string;
  avatarUrl?: string;
  sharedLeagueCount: number;
  sharedLeagueNames: string[];
  mutualFollowerCount: number;
  mutualFollowers: Array<{
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>;
};

function mutual(username: string, displayName: string) {
  return { username, displayName, avatarUrl: undefined };
}

function suggestion(overrides: Partial<Suggestion> & { username: string }) {
  return {
    _id: fakeId<'users'>(overrides.username),
    displayName: overrides.username,
    avatarUrl: undefined,
    sharedLeagueCount: 1,
    sharedLeagueNames: ['Monaco Masters'],
    mutualFollowerCount: 0,
    mutualFollowers: [],
    ...overrides,
  } satisfies Suggestion;
}

function render(suggestions: Suggestion[]) {
  return (
    <StorybookMockProviders
      auth={{ isLoaded: true, isSignedIn: true }}
      convex={buildStorybookConvexMocks({
        queries: [
          [api.follows.getSuggestedLeagueMembersToFollow, suggestions],
          [api.follows.isFollowing, false],
        ],
        mutations: [
          [api.follows.follow, async () => null],
          [api.follows.unfollow, async () => null],
        ],
      })}
    >
      {/* The width the card actually gets in the dashboard's right rail. */}
      <div className="w-[300px]">
        <SuggestedFollowsCard />
      </div>
    </StorybookMockProviders>
  );
}

const meta = {
  title: 'Dashboard/SuggestedFollowsCard',
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * Every reason variant at once, in the order the backend ranks them: mutual
 * followers first, shared leagues as the fallback. This is the story to look at
 * when changing the copy in `reasonText`.
 */
export const ReasonVariants: Story = {
  render: () =>
    render([
      suggestion({
        username: 'oscarp',
        displayName: 'Oscar Piastri',
        mutualFollowerCount: 3,
        mutualFollowers: [
          mutual('lando', 'Lando'),
          mutual('george', 'George'),
          mutual('carlos', 'Carlos'),
        ],
      }),
      suggestion({
        username: 'charles',
        displayName: 'Charles Leclerc',
        mutualFollowerCount: 1,
        mutualFollowers: [mutual('lando', 'Lando Norris')],
      }),
      suggestion({
        username: 'kimi',
        displayName: 'Kimi Antonelli',
        sharedLeagueNames: ['Monaco Masters', 'Office GP'],
        sharedLeagueCount: 2,
      }),
    ]),
};

/**
 * The overflow cases that break alignment if the row is not `min-w-0` all the
 * way down: a display name with nowhere to wrap, and more mutuals than the
 * backend names.
 */
export const LongNamesAndOverflow: Story = {
  render: () =>
    render([
      suggestion({
        username: 'verylong',
        displayName: 'Maximilian Emilian Verstappen-Jos',
        mutualFollowerCount: 12,
        mutualFollowers: [
          mutual('lando', 'Lando'),
          mutual('george', 'George'),
          mutual('carlos', 'Carlos'),
        ],
      }),
      suggestion({
        username: 'longleague',
        displayName: 'Nyck',
        sharedLeagueNames: [
          'The Very Long League Name Society',
          'Another Long One',
        ],
        sharedLeagueCount: 2,
      }),
      // Mutuals exist but none could be named (incomplete profiles), so the
      // copy has to fall back to a bare count rather than "Followed by  and 2".
      suggestion({
        username: 'unnamed',
        displayName: 'Franco Colapinto',
        mutualFollowerCount: 2,
        mutualFollowers: [],
      }),
    ]),
};
