import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps, PropsWithChildren } from 'react';

import { FeedItem } from './FeedItem/FeedItem';
import { SessionGroup } from './FeedItem/SessionGroup';
import { FeedEmptyState, FeedItemSkeleton } from './FeedItem/states';
import {
  fakeId,
  HOUR,
  MINUTE,
  mockOtherUsers,
  mockViewer,
  NOW,
} from '@/storybook/fixtures';
import {
  StorybookMockProviders,
  buildStorybookConvexMocks,
} from '@/storybook/mockAppRuntime';

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
    reactionCount: 4,
    reactionCounts: {
      fire: 2,
      nice: 1,
      wow: 1,
      funny: 0,
      oof: 0,
    },
    createdAt: NOW - 42 * MINUTE,
    viewerReaction: null,
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
        reactionType: 'fire' as const,
      },
      ...otherRevUsers.map((user, index) => ({
        ...user,
        reactionType: index === 0 ? ('nice' as const) : ('wow' as const),
      })),
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
        reactionType: 'nice' as const,
      },
    ],
  ],
]);

const convexMocks = buildStorybookConvexMocks({
  queries: [
    [api.users.me, viewer],
    [
      api.feed.getReactionUsers,
      ({ feedEventId }: { feedEventId: Id<'feedEvents'> }) =>
        revUsersByEventId.get(feedEventId) ?? [],
    ],
    [api.follows.getViewerFollowedIds, [otherRevUsers[0].userId]],
    [api.h2h.getH2HPicksForFeedItem, h2hPicks],
  ],
  mutations: [
    [api.feed.setReaction, async () => null],
    [api.feed.removeReaction, async () => null],
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
      <div className="w-[min(100%,40rem)] space-y-3">{children}</div>
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
      reactionCount: 2,
      reactionCounts: {
        fire: 1,
        nice: 1,
        wow: 0,
        funny: 0,
        oof: 0,
      },
      createdAt: NOW - 3 * HOUR,
    }),
  },
};

export const LineupChange: Story = {
  args: {
    event: makeFeedEvent({
      _id: fakeId<'feedEvents'>('feed-lineup-change'),
      type: 'lineup_change',
      // Authorless on purpose: this is the site talking. The card has to read
      // as an announcement without the avatar and name every other item leads
      // with, which is the thing worth looking at in isolation here.
      userId: undefined,
      username: undefined,
      displayName: undefined,
      avatarUrl: undefined,
      raceId: undefined,
      sessionType: undefined,
      points: undefined,
      picks: undefined,
      h2hScore: null,
      raceName: 'Dutch Grand Prix',
      raceSlug: 'netherlands-2026',
      season: 2026,
      round: 12,
      seatMoves: [
        {
          team: 'Red Bull Racing',
          outDriverCode: 'HAD',
          outDriverName: 'Isack Hadjar',
          inDriverCode: 'LAW',
          inDriverName: 'Liam Lawson',
        },
        {
          team: 'Racing Bulls',
          outDriverCode: 'LAW',
          outDriverName: 'Liam Lawson',
          inDriverCode: 'TSU',
          inDriverName: 'Yuki Tsunoda',
        },
      ],
      lineupNote:
        'Isack Hadjar broke his wrist during boxing training and is out for the Dutch Grand Prix. Liam Lawson steps up to Red Bull alongside Max Verstappen, and Yuki Tsunoda takes the vacated Racing Bulls seat next to Arvid Lindblad. Hadjar is expected back in his car for Monza.',
      reactionCount: 6,
      reactionCounts: { fire: 2, nice: 1, wow: 3, funny: 0, oof: 0 },
      createdAt: NOW - 20 * MINUTE,
    }),
  },
};

/** A new entry taking a seat nobody vacated: no strike-through, no arrow. */
export const LineupChangeNewEntry: Story = {
  args: {
    event: makeFeedEvent({
      _id: fakeId<'feedEvents'>('feed-lineup-debut'),
      type: 'lineup_change',
      userId: undefined,
      username: undefined,
      displayName: undefined,
      avatarUrl: undefined,
      raceId: undefined,
      sessionType: undefined,
      points: undefined,
      picks: undefined,
      h2hScore: null,
      raceName: 'Italian Grand Prix',
      raceSlug: 'italy-2026',
      season: 2026,
      round: 13,
      seatMoves: [
        {
          team: 'Cadillac',
          inDriverCode: 'PER',
          inDriverName: 'Sergio Perez',
        },
      ],
      lineupNote: undefined,
      reactionCount: 0,
      reactionCounts: { fire: 0, nice: 0, wow: 0, funny: 0, oof: 0 },
      createdAt: NOW - 2 * HOUR,
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
      h2h: [
        {
          team: 'Ferrari',
          winner: {
            code: 'LEC',
            displayName: 'Charles Leclerc',
            team: 'Ferrari',
          },
          loser: {
            code: 'HAM',
            displayName: 'Lewis Hamilton',
            team: 'Ferrari',
          },
        },
        {
          team: 'McLaren',
          winner: {
            code: 'PIA',
            displayName: 'Oscar Piastri',
            team: 'McLaren',
          },
          loser: { code: 'NOR', displayName: 'Lando Norris', team: 'McLaren' },
        },
        {
          team: 'Mercedes',
          winner: {
            code: 'ANT',
            displayName: 'Kimi Antonelli',
            team: 'Mercedes',
          },
          loser: {
            code: 'RUS',
            displayName: 'George Russell',
            team: 'Mercedes',
          },
        },
        {
          team: 'Red Bull Racing',
          winner: {
            code: 'VER',
            displayName: 'Max Verstappen',
            team: 'Red Bull Racing',
          },
          loser: {
            code: 'LAW',
            displayName: 'Liam Lawson',
            team: 'Red Bull Racing',
          },
        },
        {
          team: 'Williams',
          winner: { code: 'ALB', displayName: 'Alex Albon', team: 'Williams' },
          loser: { code: 'SAI', displayName: 'Carlos Sainz', team: 'Williams' },
        },
      ],
    };

    const events = [
      makeFeedEvent({
        _id: fakeId<'feedEvents'>('feed-group-1'),
        createdAt: NOW - 40 * MINUTE,
      }),
      makeFeedEvent({
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
        reactionCount: 3,
        reactionCounts: {
          fire: 1,
          nice: 1,
          wow: 1,
          funny: 0,
          oof: 0,
        },
        createdAt: NOW - 39 * MINUTE,
        viewerReaction: 'fire',
      }),
      makeFeedEvent({
        _id: fakeId<'feedEvents'>('feed-group-viewer'),
        userId: viewer._id,
        username: viewer.username,
        displayName: viewer.displayName,
        avatarUrl: viewer.avatarUrl,
        points: 14,
        h2hScore: {
          correctPicks: 1,
          totalPicks: 2,
          points: 1,
        },
        reactionCount: 0,
        reactionCounts: {
          fire: 0,
          nice: 0,
          wow: 0,
          funny: 0,
          oof: 0,
        },
        createdAt: NOW - 39 * MINUTE,
      }),
      makeFeedEvent({
        _id: fakeId<'feedEvents'>('feed-group-3'),
        userId: fakeId<'users'>('user-noah'),
        username: 'noah',
        displayName: 'Noah Evans',
        avatarUrl: 'https://i.pravatar.cc/80?img=20',
        points: 9,
        h2hScore: null,
        reactionCount: 0,
        reactionCounts: {
          fire: 0,
          nice: 0,
          wow: 0,
          funny: 0,
          oof: 0,
        },
        createdAt: NOW - 38 * MINUTE,
      }),
    ];

    return (
      <SessionGroup session={session} events={events} viewerId={viewer._id} />
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
