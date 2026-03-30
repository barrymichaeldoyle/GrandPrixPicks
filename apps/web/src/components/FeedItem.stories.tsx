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
  StorybookMockProviders,
  buildStorybookConvexMocks,
} from '../storybook/mockAppRuntime';
import { StorybookRouter } from '../stories/router-decorator';

type FeedEvent = ComponentProps<typeof FeedItem>['event'];

const now = Date.now();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function fakeFeedEventId(value: string) {
  return value as Id<'feedEvents'>;
}

function fakeUserId(value: string) {
  return value as Id<'users'>;
}

function fakeRaceId(value: string) {
  return value as Id<'races'>;
}

function fakeLeagueId(value: string) {
  return value as Id<'leagues'>;
}

const viewer = {
  _id: fakeUserId('viewer'),
  username: 'barry',
  avatarUrl: 'https://i.pravatar.cc/80?img=13',
};

const author = {
  _id: fakeUserId('user-nina'),
  username: 'nina',
  displayName: 'Nina Costa',
  avatarUrl: 'https://i.pravatar.cc/80?img=5',
};

const otherRevUsers = [
  {
    userId: fakeUserId('user-sam'),
    username: 'sam',
    displayName: 'Sam Reid',
    avatarUrl: 'https://i.pravatar.cc/80?img=12',
  },
  {
    userId: fakeUserId('user-lee'),
    username: 'lee',
    displayName: 'Lee Harper',
    avatarUrl: 'https://i.pravatar.cc/80?img=15',
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
    _id: fakeFeedEventId('feed-score-published'),
    type: 'score_published',
    userId: author._id,
    username: author.username,
    displayName: author.displayName,
    avatarUrl: author.avatarUrl,
    raceId: fakeRaceId('miami-gp'),
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
    createdAt: now - 42 * MINUTE,
    viewerHasReved: false,
    ...overrides,
  };
}

const revUsersByEventId = new Map([
  [
    fakeFeedEventId('feed-score-published'),
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
    fakeFeedEventId('feed-locked'),
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
      _id: fakeFeedEventId('feed-locked'),
      type: 'session_locked',
      points: undefined,
      h2hScore: null,
      createdAt: now - 12 * MINUTE,
    }),
  },
};

export const JoinedLeague: Story = {
  args: {
    event: makeFeedEvent({
      _id: fakeFeedEventId('feed-joined-league'),
      type: 'joined_league',
      raceId: undefined,
      sessionType: undefined,
      points: undefined,
      raceName: undefined,
      raceSlug: undefined,
      picks: undefined,
      h2hScore: null,
      leagueId: fakeLeagueId('legends-league'),
      leagueName: 'Legends League',
      leagueSlug: 'legends-league',
      revCount: 2,
      createdAt: now - 3 * HOUR,
    }),
  },
};

export const StreakMilestone: Story = {
  args: {
    event: makeFeedEvent({
      _id: fakeFeedEventId('feed-streak'),
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
      createdAt: now - 26 * HOUR,
    }),
  },
};

export const GroupedSession: Story = {
  render: () => {
    const session = {
      raceName: 'Miami Grand Prix',
      sessionType: 'race',
      raceSlug: 'miami-grand-prix',
      createdAt: now - 50 * MINUTE,
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
            _id: fakeFeedEventId('feed-group-1'),
            createdAt: now - 40 * MINUTE,
          })}
          grouped
          position="first"
        />
        <FeedItem
          event={makeFeedEvent({
            _id: fakeFeedEventId('feed-group-2'),
            userId: fakeUserId('user-oliver'),
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
            createdAt: now - 39 * MINUTE,
            viewerHasReved: true,
          })}
          grouped
          position="middle"
        />
        <FeedItem
          event={makeFeedEvent({
            _id: fakeFeedEventId('feed-group-3'),
            userId: fakeUserId('user-noah'),
            username: 'noah',
            displayName: 'Noah Evans',
            avatarUrl: 'https://i.pravatar.cc/80?img=20',
            points: 9,
            h2hScore: null,
            revCount: 0,
            recentRevUsers: [],
            createdAt: now - 38 * MINUTE,
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
