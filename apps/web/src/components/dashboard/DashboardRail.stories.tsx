import { api } from '@convex-generated/api';
import type { Meta, StoryObj } from '@storybook/react';

import { ViewerSessionProvider } from '@/integrations/clerk/viewer-session-context';
import { fakeId } from '@/storybook/fixtures';
import {
  buildStorybookConvexMocks,
  StorybookMockProviders,
} from '@/storybook/mockAppRuntime';
import { RAIL_WIDTH } from '@/storybook/railDecorator';
import { FeedbackCard } from './FeedbackCard';
import { LatestResultCard } from './LatestResultCard';
import { MyLeaguesCard } from './MyLeaguesCard';
import { ProfileCard } from './ProfileCard';
import { QuickLinksCard } from './QuickLinksCard';
import { RailFooterLinks } from './RailFooterLinks';
import { SeasonStandingCard } from './SeasonStandingCard';

/**
 * Both dashboard rails, side by side at the width they actually get.
 *
 * The individual card stories are for one card's states. This one is for the
 * thing you cannot see in any of them: whether the column reads as a set —
 * heading shapes, where the accent lands, how each card ends. A card that looks
 * fine alone can still be the odd one out here.
 */
const me = {
  _id: fakeId<'users'>('barry'),
  username: 'barry',
  displayName: 'Barry Doyle',
  avatarUrl: undefined,
};

const seasonLeaderboard = {
  entries: [],
  totalCount: 1_284,
  viewerEntry: {
    userId: me._id,
    username: 'barry',
    rank: 47,
    points: 612,
    top5Points: 534,
    h2hPoints: 78,
  },
};

const latestWeekend = {
  raceId: fakeId<'races'>('netherlands-2026'),
  raceSlug: 'netherlands-2026',
  raceName: 'Dutch Grand Prix',
  raceRound: 12,
  raceStatus: 'finished' as const,
  raceDate: Date.UTC(2026, 7, 23, 13, 0),
  hasSprint: false,
  sessions: { quali: null, sprint_quali: null, sprint: null, race: null },
  totalPoints: 93,
  hasScores: true,
  top5Rank: 1,
  top5FieldSize: 14,
  submittedAt: Date.UTC(2026, 7, 22, 9, 0),
};

const latestLeaderboard = {
  status: 'visible' as const,
  reason: null,
  entries: [
    {
      rank: 1,
      userId: me._id,
      username: 'barry',
      displayName: 'Barry Doyle',
      avatarUrl: undefined,
      points: 93,
      top5Points: 82,
      h2hPoints: 11,
      isViewer: true,
    },
  ],
};

const league = {
  _id: fakeId<'leagues'>('monaco-masters'),
  name: 'Monaco Masters',
  slug: 'monaco-masters',
  memberCount: 12,
};

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4" style={{ width: RAIL_WIDTH }}>
      {children}
    </div>
  );
}

function render({ populated }: { populated: boolean }) {
  return (
    <StorybookMockProviders
      auth={{ isLoaded: true, isSignedIn: true }}
      convex={buildStorybookConvexMocks({
        queries: [
          [api.follows.getSuggestedLeagueMembersToFollow, []],
          [api.leagues.getMyLeagues, populated ? [league] : []],
        ],
      })}
    >
      <ViewerSessionProvider
        value={{ isSignedIn: true, confirmedSignedIn: true, isLoaded: true }}
      >
        <div className="flex flex-wrap gap-8">
          <Rail>
            <ProfileCard me={me as never} />
            <SeasonStandingCard
              leaderboard={
                (populated
                  ? seasonLeaderboard
                  : { ...seasonLeaderboard, viewerEntry: null }) as never
              }
            />
            <QuickLinksCard />
          </Rail>
          <Rail>
            <MyLeaguesCard leagues={(populated ? [league] : []) as never} />
            <LatestResultCard
              weekend={populated ? (latestWeekend as never) : undefined}
              leaderboard={populated ? (latestLeaderboard as never) : undefined}
              loading={false}
              hideWhenEmpty
            />
            <FeedbackCard />
            <RailFooterLinks />
          </Rail>
        </div>
      </ViewerSessionProvider>
    </StorybookMockProviders>
  );
}

const meta = {
  title: 'Dashboard/Rail/Overview',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A returning player: every card has real content. */
export const Populated: Story = { render: () => render({ populated: true }) };

/**
 * A new account. Three of these cards are now nothing but a heading and a
 * prompt, which is the case where the rail is most at risk of reading as a
 * stack of placeholders.
 */
export const NewPlayer: Story = { render: () => render({ populated: false }) };
