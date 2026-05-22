import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps, PropsWithChildren } from 'react';

import {
  FeedEmptyState,
  FeedItem,
  FeedItemSkeleton,
  SessionSeparator,
} from './FeedItem';
import {
  fakeId,
  HOUR,
  MINUTE,
  mockOtherUsers,
  mockViewer,
  NOW,
} from '../storybook/fixtures';
import {
  StorybookMockProviders,
  buildStorybookConvexMocks,
} from '../storybook/mockAppRuntime';
import { StorybookRouter } from '../stories/router-decorator';

type FeedEvent = ComponentProps<typeof FeedItem>['event'];

const viewer = mockViewer;
const author = mockOtherUsers[0]!;
const otherRevUsers = [
  {
    userId: mockOtherUsers[1]!._id,
    username: mockOtherUsers[1]!.username,
    displayName: mockOtherUsers[1]!.displayName,
    avatarUrl: mockOtherUsers[1]!.avatarUrl,
  },
  {
    userId: mockOtherUsers[2]!._id,
    username: mockOtherUsers[2]!.username,
    displayName: mockOtherUsers[2]!.displayName,
    avatarUrl: mockOtherUsers[2]!.avatarUrl,
  },
];

const h2hPicks = [
  {
    matchupId: 'mclaren',
    team: 'McLaren',
    driver1: {
      _id: 'nor',
      code: 'NOR',
      displayName: 'Lando Norris',
      team: 'McLaren',
      nationality: 'GB',
    },
    driver2: {
      _id: 'pia',
      code: 'PIA',
      displayName: 'Oscar Piastri',
      team: 'McLaren',
      nationality: 'AU',
    },
    predictedWinnerId: 'pia',
    actualWinnerId: 'pia',
    correct: true,
    hasResult: true,
  },
  {
    matchupId: 'ferrari',
    team: 'Ferrari',
    driver1: {
      _id: 'lec',
      code: 'LEC',
      displayName: 'Charles Leclerc',
      team: 'Ferrari',
      nationality: 'MC',
    },
    driver2: {
      _id: 'ham',
      code: 'HAM',
      displayName: 'Lewis Hamilton',
      team: 'Ferrari',
      nationality: 'GB',
    },
    predictedWinnerId: 'lec',
    actualWinnerId: 'ham',
    correct: false,
    hasResult: true,
  },
];

function makeFeedEvent(overrides: Partial<FeedEvent> = {}): FeedEvent {
  return {
    _id: fakeId<'feedEvents'>('feed-score-published'),
    type: 'score_published',
    userId: author._id,
    username: author.username,
    displayName: author.displayName,
    avatarUrl: author.avatarUrl,
    raceId: fakeId<'races'>('miami-gp'),
    sessionType: 'race',
    points: 17,
    raceName: 'Miami Grand Prix',
    raceSlug: 'miami-grand-prix',
    season: 2026,
    picks: [
      {
        predictedPosition: 1,
        code: 'PIA',
        displayName: 'Oscar Piastri',
        team: 'McLaren',
        nationality: 'AU',
        actualPosition: 1,
        points: 5,
      },
      {
        predictedPosition: 2,
        code: 'NOR',
        displayName: 'Lando Norris',
        team: 'McLaren',
        nationality: 'GB',
        actualPosition: 3,
        points: 3,
      },
      {
        predictedPosition: 3,
        code: 'VER',
        displayName: 'Max Verstappen',
        team: 'Red Bull Racing',
        nationality: 'NL',
        actualPosition: 2,
        points: 3,
      },
      {
        predictedPosition: 4,
        code: 'LEC',
        displayName: 'Charles Leclerc',
        team: 'Ferrari',
        nationality: 'MC',
        actualPosition: 5,
        points: 1,
      },
      {
        predictedPosition: 5,
        code: 'HAM',
        displayName: 'Lewis Hamilton',
        team: 'Ferrari',
        nationality: 'GB',
        actualPosition: 8,
        points: 0,
      },
    ],
    h2hScore: {
      correctPicks: 1,
      totalPicks: 2,
      points: 1,
    },
    revCount: 4,
    recentRevUsers: [
      {
        userId: otherRevUsers[0].userId,
        username: otherRevUsers[0].username,
        avatarUrl: otherRevUsers[0].avatarUrl,
      },
      {
        userId: otherRevUsers[1].userId,
        username: otherRevUsers[1].username,
        avatarUrl: otherRevUsers[1].avatarUrl,
      },
    ],
    createdAt: NOW - 42 * MINUTE,
    viewerHasReved: false,
    ...overrides,
  };
}

const revUsersByEventId = new Map([
  [
    fakeId<'feedEvents'>('feed-score-published'),
    [
      {
        userId: viewer._id,
        username: viewer.username,
        displayName: 'Barry',
        avatarUrl: viewer.avatarUrl,
      },
      ...otherRevUsers,
    ],
  ],
  [
    fakeId<'feedEvents'>('feed-locked'),
    [
      {
        userId: otherRevUsers[0].userId,
        username: otherRevUsers[0].username,
        displayName: otherRevUsers[0].displayName,
        avatarUrl: otherRevUsers[0].avatarUrl,
      },
    ],
  ],
]);

const convexMocks = buildStorybookConvexMocks({
  queries: [
    [api.users.me, viewer],
    [
      api.feed.getRevUsers,
      ({ feedEventId }: { feedEventId: Id<'feedEvents'> }) =>
        revUsersByEventId.get(feedEventId) ?? [],
    ],
    [api.follows.getViewerFollowedIds, [otherRevUsers[0].userId]],
    [api.h2h.getH2HPicksForFeedItem, h2hPicks],
  ],
  mutations: [
    [api.feed.giveRev, async () => null],
    [api.feed.removeRev, async () => null],
    [api.follows.follow, async () => null],
    [api.follows.unfollow, async () => null],
  ],
});

function StoryShell({ children }: PropsWithChildren) {
  return (
    <StorybookMockProviders
      auth={{ isLoaded: true, isSignedIn: true }}
      convex={convexMocks}
    >
      <StorybookRouter>
        <div className="w-[min(100%,40rem)] space-y-3">{children}</div>
      </StorybookRouter>
    </StorybookMockProviders>
  );
}

const meta = {
  title: 'Components/FeedItem',
  component: FeedItem,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <StoryShell>
        <Story />
      </StoryShell>
    ),
  ],
  args: {
    event: makeFeedEvent(),
  },
} satisfies Meta<typeof FeedItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScorePublished: Story = {};

export const SessionLocked: Story = {
  args: {
    event: makeFeedEvent({
      _id: fakeId<'feedEvents'>('feed-locked'),
      type: 'session_locked',
      points: undefined,
      h2hScore: null,
      createdAt: NOW - 12 * MINUTE,
    }),
  },
};

export const JoinedLeague: Story = {
  args: {
    event: makeFeedEvent({
      _id: fakeId<'feedEvents'>('feed-joined-league'),
      type: 'joined_league',
      raceId: undefined,
      sessionType: undefined,
      points: undefined,
      raceName: undefined,
      raceSlug: undefined,
      picks: undefined,
      h2hScore: null,
      leagueId: fakeId<'leagues'>('legends-league'),
      leagueName: 'Legends League',
      leagueSlug: 'legends-league',
      revCount: 2,
      createdAt: NOW - 3 * HOUR,
    }),
  },
};

export const StreakMilestone: Story = {
  args: {
    event: makeFeedEvent({
      _id: fakeId<'feedEvents'>('feed-streak'),
      type: 'streak_milestone',
      raceId: undefined,
      sessionType: undefined,
      points: undefined,
      raceName: undefined,
      raceSlug: undefined,
      picks: undefined,
      h2hScore: null,
      streakCount: 5,
      revCount: 7,
      viewerHasReved: true,
      createdAt: NOW - 26 * HOUR,
    }),
  },
};

export const GroupedSession: Story = {
  render: () => {
    const session = {
      raceName: 'Miami Grand Prix',
      sessionType: 'race',
      raceSlug: 'miami-grand-prix',
      createdAt: NOW - 50 * MINUTE,
      top5: [
        {
          code: 'PIA',
          displayName: 'Oscar Piastri',
          team: 'McLaren',
          nationality: 'AU',
        },
        {
          code: 'VER',
          displayName: 'Max Verstappen',
          team: 'Red Bull Racing',
          nationality: 'NL',
        },
        {
          code: 'NOR',
          displayName: 'Lando Norris',
          team: 'McLaren',
          nationality: 'GB',
        },
        {
          code: 'LEC',
          displayName: 'Charles Leclerc',
          team: 'Ferrari',
          nationality: 'MC',
        },
        {
          code: 'HAM',
          displayName: 'Lewis Hamilton',
          team: 'Ferrari',
          nationality: 'GB',
        },
      ],
    };

    return (
      <div>
        <SessionSeparator session={session} grouped />
        <FeedItem
          event={makeFeedEvent({
            _id: fakeId<'feedEvents'>('feed-group-1'),
            createdAt: NOW - 40 * MINUTE,
          })}
          grouped
          position="first"
        />
        <FeedItem
          event={makeFeedEvent({
            _id: fakeId<'feedEvents'>('feed-group-2'),
            userId: fakeId<'users'>('user-oliver'),
            username: 'oliver',
            displayName: 'Oliver Kane',
            avatarUrl: 'https://i.pravatar.cc/80?img=18',
            points: 21,
            h2hScore: {
              correctPicks: 2,
              totalPicks: 2,
              points: 2,
            },
            revCount: 1,
            createdAt: NOW - 39 * MINUTE,
            viewerHasReved: true,
          })}
          grouped
          position="middle"
        />
        <FeedItem
          event={makeFeedEvent({
            _id: fakeId<'feedEvents'>('feed-group-3'),
            userId: fakeId<'users'>('user-noah'),
            username: 'noah',
            displayName: 'Noah Evans',
            avatarUrl: 'https://i.pravatar.cc/80?img=20',
            points: 9,
            h2hScore: null,
            revCount: 0,
            recentRevUsers: [],
            createdAt: NOW - 38 * MINUTE,
          })}
          grouped
          position="last"
        />
      </div>
    );
  },
};

export const FeedStates: Story = {
  render: () => (
    <div className="space-y-3">
      <FeedItem event={makeFeedEvent()} />
      <FeedItemSkeleton />
      <FeedEmptyState message="Follow players or join leagues to see activity here." />
    </div>
  ),
};
