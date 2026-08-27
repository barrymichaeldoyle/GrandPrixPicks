import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { useQuery } from '@/integrations/convex/query';

import { AppPageLayout, RailItem } from '@/components/AppPageLayout';
import { FeedbackCard } from '@/components/dashboard/FeedbackCard';
import { LatestResultCard } from '@/components/dashboard/LatestResultCard';
import { MyLeaguesCard } from '@/components/dashboard/MyLeaguesCard';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { QuickLinksCard } from '@/components/dashboard/QuickLinksCard';
import { RailFooterLinks } from '@/components/dashboard/RailFooterLinks';
import { SeasonStandingCard } from '@/components/dashboard/SeasonStandingCard';
import { SuggestedFollowsCard } from '@/components/dashboard/SuggestedFollowsCard';
import type { H2HMatchup } from '@/components/H2HMatchupGrid';
import { AdSlot } from '@/components/AdSlot';
import { FeedContent } from '@/components/feed/FeedContent';
import { useAuthCurtainGate } from '@/integrations/clerk/auth-curtain';
import { AD_SLOTS } from '@/lib/adsense';

import { DashboardWeekendPicks } from './DashboardWeekendPicks';
import type { DashboardSsrData } from './ssr';
import { liveOrSsr, weekendReflectsViewer } from './dashboardState';

export function DashboardPage({
  initialRace,
  initialDrivers = [],
  initialMatchups,
  initialDashboard,
}: {
  /** Seeds the weekend card's identity from SSR, so the race name (this page's
   *  LCP element) does not wait on Convex re-answering for the signed-in
   *  viewer. See `DashboardWeekendPicksSkeleton`. */
  initialRace?: Doc<'races'> | null;
  initialDrivers?: Doc<'drivers'>[];
  initialMatchups?: H2HMatchup[];
  /** The viewer's own above-the-fold data, read as the viewer during SSR.
   *  Null whenever that read could not happen — see `./ssr`. */
  initialDashboard?: DashboardSsrData | null;
} = {}) {
  /*
   * `?? initial` and not `||`, and `!== undefined` rather than truthiness,
   * because these queries use null as an answer: null means "no open weekend"
   * and undefined means "has not answered yet". Only the second one should fall
   * back to the SSR value.
   *
   * The fallback is what renders on the server, where the live query has
   * nothing, and again through hydration until the socket's first answer — so
   * the card does not fill in, empty out and fill in again. Once Convex
   * answers, its value wins for good; nothing here goes stale.
   */
  const currentWeekend = liveOrSsr(
    useQuery(api.races.getCurrentWeekend, {}),
    initialDashboard?.weekend ?? undefined,
  );
  const me = liveOrSsr(
    useQuery(api.users.me, {}),
    initialDashboard?.me ?? undefined,
  );
  const history = useQuery(
    api.predictions.getUserPredictionHistory,
    me ? { userId: me._id } : 'skip',
  );
  const seasonLeaderboard = liveOrSsr(
    useQuery(api.leaderboards.getCombinedSeasonLeaderboard, { limit: 3 }),
    initialDashboard?.seasonLeaderboard ?? undefined,
  );
  const leagues = liveOrSsr(
    useQuery(api.leagues.getMyLeagues),
    initialDashboard?.leagues ?? undefined,
  );
  /*
   * The history query is deliberately *not* seeded: it walks a player's whole
   * season and exists here only to name the last scored weekend, so shipping it
   * would put a season of picks in the HTML for one card. The server picks that
   * weekend out and sends just it — which does not render the card (that still
   * waits for the race leaderboard, see `latestResultReady`) but does let the
   * leaderboard request start on the first render rather than after the history
   * comes back.
   *
   * `undefined` and not `?? null` on the live side, so an answered history with
   * no scored weekend (a new player) reads as "answered, nothing" rather than
   * falling back forever to a value SSR never had either.
   */
  const latestScoredWeekend = history
    ? history.find((weekend) => weekend.hasScores)
    : (initialDashboard?.latestScoredWeekend ?? undefined);
  const latestRaceLeaderboard = useQuery(
    api.leaderboards.getCombinedRaceLeaderboard,
    latestScoredWeekend ? { raceId: latestScoredWeekend.raceId } : 'skip',
  );

  // Ready once there is a weekend to show, whoever produced it. Waiting on
  // `history` here would have held every server-rendered card behind the one
  // query this page no longer needs before first paint.
  const latestResultReady =
    (history !== undefined || latestScoredWeekend !== undefined) &&
    (latestScoredWeekend === undefined || latestRaceLeaderboard !== undefined);

  /**
   * Holds the sign-in curtain until above-the-fold rails + weekend chrome are
   * final. The feed below is deliberately excluded.
   */
  useAuthCurtainGate(
    me !== undefined &&
      currentWeekend !== undefined &&
      // `!== undefined` only says the query answered; the first answer can still
      // be the pre-auth one, whose weekend chrome is not final.
      (currentWeekend === null ||
        weekendReflectsViewer(currentWeekend.sessions)) &&
      seasonLeaderboard !== undefined &&
      leagues !== undefined &&
      latestResultReady,
  );

  return (
    <AppPageLayout
      centerClassName="space-y-6"
      /*
       * `RailItem` order is the phone's reading order across both rails.
       *
       * Below `md` these stop being columns beside the picks card and become a
       * run of screens underneath it, so the sequence is chosen for that: the
       * player's own standing first, then leagues, then the last result, with
       * navigation and small print last. The desktop columns keep their own
       * top-to-bottom order, which is just the DOM order within each rail.
       *
       * Empty-state cards are dropped on a phone rather than hidden here: a new
       * player used to meet four consecutive placeholders ("your rank appears
       * after...", "your first result will land here"), which is a poor first
       * impression of a page whose one real job is above them. The rails keep
       * those placeholders, where an empty column would look broken instead.
       * See each card's `hideWhenEmpty`.
       */
      leftLabel="Profile and standings"
      left={
        <>
          {/* The header shows this player their own avatar and name two thumbs
              above, so on a phone this is pure repetition. */}
          <RailItem hideOnMobile>
            <ProfileCard me={me} />
          </RailItem>
          <RailItem order={1}>
            <SeasonStandingCard leaderboard={seasonLeaderboard} hideWhenEmpty />
          </RailItem>
          <RailItem order={5}>
            <QuickLinksCard />
          </RailItem>
        </>
      }
      rightLabel="Leagues and latest result"
      right={
        <>
          <RailItem order={2}>
            <MyLeaguesCard leagues={leagues} />
          </RailItem>
          <RailItem order={4}>
            <SuggestedFollowsCard />
          </RailItem>
          <RailItem order={3}>
            <LatestResultCard
              weekend={latestScoredWeekend}
              leaderboard={latestRaceLeaderboard}
              loading={!latestResultReady}
              hideWhenEmpty
            />
          </RailItem>
          {/* Under the latest result, which is the moment a player has just
              seen how they did and has an opinion about the game. On a phone
              it lands after the navigation instead: the run of rail cards is
              already long there, and an ask is the last thing to reach, not
              something to scroll past on the way to the small print. */}
          <RailItem order={6}>
            <FeedbackCard />
          </RailItem>
          <RailItem order={7}>
            <RailFooterLinks />
          </RailItem>
        </>
      }
    >
      <DashboardWeekendPicks
        weekend={currentWeekend}
        initialRace={initialRace}
        initialDrivers={initialDrivers}
        initialMatchups={initialMatchups}
        initialPredictions={initialDashboard?.predictions ?? null}
        initialH2H={initialDashboard?.h2h ?? null}
      />

      {/* No "See all" any more: this *is* all of it. The standalone /feed page
          rendered the same component and has been removed. */}
      <section aria-labelledby="dashboard-activity-heading">
        <h2
          id="dashboard-activity-heading"
          className="mb-3 text-sm font-semibold tracking-label text-text uppercase"
        >
          Activity
        </h2>
        <FeedContent />
      </section>

      {/* Below the feed, which is the one place on this page an ad can go
          without interrupting anything: the picks card and the rails are what
          a player came for, and the feed is where they are already browsing
          rather than doing. Far enough down that it loads only for readers who
          scroll to it, and that its arrival cannot score against CLS. */}
      <AdSlot slot={AD_SLOTS.dashboardFeed} />
    </AppPageLayout>
  );
}
