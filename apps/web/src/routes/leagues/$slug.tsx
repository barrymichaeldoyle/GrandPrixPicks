import { SignInButton, useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import confetti from 'canvas-confetti';
import { ConvexHttpClient } from 'convex/browser';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Gauge,
  Globe,
  Layers,
  Lock,
  LogIn,
  Settings,
  Shield,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import posthog from 'posthog-js';
import { useRef, useState } from 'react';

import { TabSwitch } from '@/components/TabSwitch';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { Button } from '../../components/Button/Button';
import {
  FeedEmptyState,
  FeedItem,
  FeedItemSkeleton,
  SessionSeparator,
} from '../../components/FeedItem';
import {
  LeagueMembersList,
  LeagueMembersListSkeleton,
} from '../../components/LeagueMembersList';
import { PageLoader } from '../../components/PageLoader';
import { isRaceSelectableForLeaderboard } from '../../lib/raceSessions';
import { canonicalMeta, defaultOgImage } from '../../lib/site';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

type TimeScope = 'season' | 'weekend';
type GameMode = 'combined' | 'top5' | 'h2h';
type LeagueView = 'standings' | 'feed';

export const Route = createFileRoute('/leagues/$slug')({
  component: LeagueDetailPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    time?: TimeScope;
    mode?: GameMode;
    raceId?: string;
    view?: LeagueView;
  } => {
    const time =
      search.time === 'weekend' || search.time === 'season'
        ? search.time
        : undefined;
    const mode =
      search.mode === 'combined' ||
      search.mode === 'top5' ||
      search.mode === 'h2h'
        ? search.mode
        : undefined;
    const raceId =
      typeof search.raceId === 'string' ? search.raceId : undefined;
    const view =
      search.view === 'feed' || search.view === 'standings'
        ? search.view
        : undefined;
    return { time, mode, raceId, view };
  },
  loader: async ({ params }) => {
    const league = await convex.query(api.leagues.getLeagueBySlug, {
      slug: params.slug,
    });
    if (!league) {
      throw notFound();
    }
    return { league };
  },
  head: ({ loaderData, params }) => {
    const league = loaderData?.league;
    const title = league
      ? `${league.name} | Grand Prix Picks`
      : 'League Standings & Predictions | Grand Prix Picks';
    const description = league
      ? league.description
        ? `${league.name} — ${league.description}`
        : `Compete with other members in ${league.name}. View standings and make your F1 predictions on Grand Prix Picks.`
      : 'View league standings, track member rankings, and compete with friends in this private F1 prediction league.';
    const ogImage = defaultOgImage;
    const canonical = canonicalMeta(`/leagues/${params.slug}`);
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: ogImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function LeagueDetailPage() {
  const isSettingsSubroute = useRouterState({
    select: (state) => state.location.pathname.endsWith('/settings'),
  });

  if (isSettingsSubroute) {
    return <Outlet />;
  }

  const { slug } = Route.useParams();
  const { isSignedIn, isLoaded } = useAuth();
  const league = useQuery(api.leagues.getLeagueBySlug, { slug });
  const currentLeagueUrl =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (!isLoaded || league === undefined) {
    return <PageLoader />;
  }

  if (league === null) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <Shield className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              League Not Found
            </h1>
            <p className="mb-4 text-text-muted">
              This league doesn't exist or may have been deleted.
            </p>
            <Button asChild size="sm" leftIcon={ArrowLeft}>
              <Link to="/leagues">Back to Leagues</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not signed in — show sign-in prompt with league info
  if (!isSignedIn) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-lg px-4 py-16">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">{league.name}</h1>
            <p className="mb-1 text-text-muted">
              {league.memberCount} member
              {league.memberCount !== 1 ? 's' : ''}
            </p>
            {league.description && (
              <p className="mb-4 text-sm text-text-muted">
                {league.description}
              </p>
            )}
            <p className="mb-4 text-text-muted">Sign in to join this league.</p>
            <SignInButton
              mode="modal"
              fallbackRedirectUrl={currentLeagueUrl}
              signUpFallbackRedirectUrl={currentLeagueUrl}
            >
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  return <LeagueDetailContent league={league} />;
}

type League = NonNullable<
  ReturnType<typeof useQuery<typeof api.leagues.getLeagueBySlug>>
>;

function LeagueDetailContent({ league }: { league: League }) {
  const isAdmin = league.viewerRole === 'admin';
  const isMember = league.viewerRole !== null;

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Button asChild size="sm" variant="text">
              <Link to="/leagues">← Back to leagues</Link>
            </Button>
            {isAdmin && (
              <Button asChild size="sm" variant="secondary" leftIcon={Settings}>
                <Link
                  to="/leagues/$slug/settings"
                  params={{ slug: league.slug }}
                >
                  Settings
                </Link>
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-text">{league.name}</h1>
            {isAdmin && <Crown className="h-5 w-5 text-warning" />}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                league.visibility === 'public'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {league.visibility === 'public' ? (
                <>
                  <Globe className="h-3 w-3" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Private
                </>
              )}
            </span>
          </div>
          {league.description && (
            <p className="mt-1 text-text-muted">{league.description}</p>
          )}
          <p className="mt-1 text-sm text-text-muted">
            {league.memberCount} member{league.memberCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Join flow for non-members */}
        {!isMember && (
          <JoinSection leagueId={league._id} hasPassword={league.hasPassword} />
        )}

        {/* Share link — visible to all members */}
        {isMember && <ShareLinkSection slug={league.slug} />}

        {isMember && (
          <LeagueTabs leagueId={league._id} leagueName={league.name} />
        )}
      </div>
    </div>
  );
}

function JoinSection({
  leagueId,
  hasPassword,
}: {
  leagueId: Id<'leagues'>;
  hasPassword: boolean;
}) {
  const joinLeague = useMutation(api.leagues.joinLeague);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  async function handleJoin() {
    setError(null);
    setIsJoining(true);
    try {
      await joinLeague({
        leagueId,
        password: password || undefined,
      });
      posthog.capture('league_joined');
      await confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to join league',
      );
      setIsJoining(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-6 text-center">
      <Users className="mx-auto mb-4 h-12 w-12 text-accent" />
      <h2 className="mb-2 text-lg font-semibold text-text">Join this league</h2>
      {hasPassword && (
        <div className="mx-auto mb-3 max-w-xs">
          <div className="flex items-center gap-2">
            <Lock
              className="h-4 w-4 shrink-0 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              aria-label="League password"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
          </div>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-error">{error}</p>}
      <Button size="sm" loading={isJoining} onClick={() => void handleJoin()}>
        Join League
      </Button>
    </div>
  );
}

function ShareLinkSection({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const leagueUrl = `${window.location.origin}/leagues/${slug}`;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(leagueUrl);
    posthog.capture('league_invite_copied');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold text-text-muted">
        Share League
      </h3>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-surface-muted px-3 py-2 text-sm text-text">
          {leagueUrl}
        </code>
        <button
          type="button"
          onClick={() => void copyToClipboard()}
          aria-label={copied ? 'Copied!' : 'Copy league link'}
          className="shrink-0 rounded-lg border border-border p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? 'Link copied!' : ''}
        </span>
      </div>
    </div>
  );
}

// Retains the last non-undefined value so tabs show cached data instead of a
// spinner when their query is re-activated after being skipped.
function useStickyValue<T>(value: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  if (value !== undefined) {
    ref.current = value;
  }
  return ref.current;
}

const VIEW_OPTIONS = [
  { value: 'standings' as const, label: 'Standings', leftIcon: Trophy },
  { value: 'feed' as const, label: 'Feed', leftIcon: Gauge },
];

function LeagueTabs({
  leagueId,
  leagueName,
}: {
  leagueId: Id<'leagues'>;
  leagueName: string;
}) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const view: LeagueView = search.view ?? 'standings';

  return (
    <div>
      <div className="mb-4">
        <TabSwitch
          value={view}
          onChange={(v) =>
            navigate({
              search: (prev) => ({ ...prev, view: v }),
              replace: true,
            })
          }
          options={VIEW_OPTIONS}
          className="flex gap-1"
          buttonClassName="flex-1"
          ariaLabel="League view"
        />
      </div>
      {view === 'standings' ? (
        <LeagueMembers leagueId={leagueId} leagueName={leagueName} />
      ) : (
        <LeagueFeed leagueId={leagueId} />
      )}
    </div>
  );
}

const MAX_LEAGUE_FEED_EXTRA_PAGES = 4;

export function LeagueFeed({ leagueId }: { leagueId: Id<'leagues'> }) {
  const [extraCursors, setExtraCursors] = useState<(string | null)[]>(
    Array(MAX_LEAGUE_FEED_EXTRA_PAGES).fill(null),
  );

  const page0 = useQuery(api.feed.getLeagueFeed, { leagueId });
  const page1 = useQuery(
    api.feed.getLeagueFeed,
    extraCursors[0] !== null
      ? { leagueId, paginationCursor: extraCursors[0] }
      : 'skip',
  );
  const page2 = useQuery(
    api.feed.getLeagueFeed,
    extraCursors[1] !== null
      ? { leagueId, paginationCursor: extraCursors[1] }
      : 'skip',
  );
  const page3 = useQuery(
    api.feed.getLeagueFeed,
    extraCursors[2] !== null
      ? { leagueId, paginationCursor: extraCursors[2] }
      : 'skip',
  );
  const page4 = useQuery(
    api.feed.getLeagueFeed,
    extraCursors[3] !== null
      ? { leagueId, paginationCursor: extraCursors[3] }
      : 'skip',
  );

  const allPageData = [page0, page1, page2, page3, page4];
  const activePagesCount = 1 + extraCursors.filter((c) => c !== null).length;
  const activePages = allPageData.slice(0, activePagesCount);
  const isLoadingMore =
    activePagesCount > 1 && activePages.some((p) => p === undefined);

  const loadedPages = activePages.filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );
  const lastLoadedPage = loadedPages.at(-1);

  const hasMore =
    (lastLoadedPage?.hasMore ?? false) &&
    activePagesCount <= MAX_LEAGUE_FEED_EXTRA_PAGES;

  function handleLoadMore() {
    if (!lastLoadedPage?.nextCursor) {
      return;
    }
    setExtraCursors((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c === null);
      if (idx !== -1) {
        next[idx] = lastLoadedPage.nextCursor;
      }
      return next;
    });
  }

  if (page0 === undefined) {
    return (
      <div className="space-y-3">
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
      </div>
    );
  }

  const allEvents = loadedPages.flatMap((p) => p.events);
  const allSessions = Object.assign({}, ...loadedPages.map((p) => p.sessions));

  if (allEvents.length === 0) {
    return (
      <FeedEmptyState
        icon={Gauge}
        message="No activity yet. Scores will appear here once race results are published."
      />
    );
  }

  type FeedEvent = (typeof allEvents)[number];
  type Group =
    | { kind: 'session'; key: string; events: FeedEvent[] }
    | { kind: 'standalone'; event: FeedEvent };

  const groups: Group[] = [];
  const sessionGroupMap = new Map<string, Group & { kind: 'session' }>();

  for (const event of allEvents) {
    if (
      (event.type === 'score_published' || event.type === 'session_locked') &&
      event.raceId &&
      event.sessionType
    ) {
      const key = `${event.raceId}_${event.sessionType}`;
      let group = sessionGroupMap.get(key);
      if (!group) {
        group = { kind: 'session', key, events: [] };
        sessionGroupMap.set(key, group);
        groups.push(group);
      }
      group.events.push(event);
    } else {
      groups.push({ kind: 'standalone', event });
    }
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        if (group.kind === 'standalone') {
          return <FeedItem key={group.event._id} event={group.event} />;
        }
        const session = allSessions[group.key];
        const isMulti = group.events.length > 1;
        const sessionWithTime = {
          ...session,
          createdAt: group.events[group.events.length - 1]?.createdAt,
        };
        return (
          <div key={group.key}>
            <SessionSeparator session={sessionWithTime} grouped={isMulti} />
            {group.events.map((event, i) => {
              const position = !isMulti
                ? undefined
                : i === 0
                  ? 'first'
                  : i === group.events.length - 1
                    ? 'last'
                    : 'middle';
              return (
                <FeedItem
                  key={event._id}
                  event={event}
                  grouped={isMulti}
                  position={position}
                />
              );
            })}
          </div>
        );
      })}
      {isLoadingMore && (
        <div className="space-y-3">
          <FeedItemSkeleton />
          <FeedItemSkeleton />
        </div>
      )}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" size="md" onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

const TIME_SCOPE_OPTIONS = [
  { value: 'weekend' as const, label: 'Race Weekend', leftIcon: CalendarDays },
  { value: 'season' as const, label: 'Season', leftIcon: Trophy },
];

const GAME_MODE_OPTIONS = [
  { value: 'combined' as const, label: 'Combined', leftIcon: Layers },
  { value: 'top5' as const, label: 'Top 5', leftIcon: Trophy },
  { value: 'h2h' as const, label: 'H2H', leftIcon: Swords },
];

function LeagueMembers({
  leagueId,
  leagueName,
}: {
  leagueId: Id<'leagues'>;
  leagueName: string;
}) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { slug } = Route.useParams();

  const timeScope: TimeScope = search.time ?? 'weekend';
  const gameMode: GameMode = search.mode ?? 'combined';
  const selectedRaceId = search.raceId as Id<'races'> | undefined;

  const me = useQuery(api.users.me, {});
  const nextRace = useQuery(api.races.getNextRace);
  const allRaces = useQuery(api.races.listRaces, { season: 2026 });
  const weekendDefaultRace = useQuery(api.races.getWeekendLeaderboardRace, {});

  const effectiveRaceId = selectedRaceId ?? weekendDefaultRace?._id;

  const selectableRaces = (allRaces ?? [])
    .filter((r) => isRaceSelectableForLeaderboard(r))
    .sort((a, b) => a.round - b.round);

  // Season queries
  const seasonTop5 = useQuery(
    api.leaderboards.getLeagueLeaderboard,
    timeScope === 'season' && gameMode === 'top5'
      ? { leagueId, limit: 100 }
      : 'skip',
  );
  const seasonCombined = useQuery(
    api.leaderboards.getLeagueCombinedSeasonLeaderboard,
    timeScope === 'season' && gameMode === 'combined'
      ? { leagueId, limit: 100 }
      : 'skip',
  );
  const seasonH2H = useQuery(
    api.leaderboards.getLeagueH2HSeasonLeaderboard,
    timeScope === 'season' && gameMode === 'h2h'
      ? { leagueId, limit: 100 }
      : 'skip',
  );

  // Weekend queries
  const weekendTop5 = useQuery(
    api.leaderboards.getLeagueRaceLeaderboard,
    timeScope === 'weekend' && gameMode === 'top5' && effectiveRaceId
      ? { leagueId, raceId: effectiveRaceId }
      : 'skip',
  );
  const weekendCombined = useQuery(
    api.leaderboards.getLeagueCombinedRaceLeaderboard,
    timeScope === 'weekend' && gameMode === 'combined' && effectiveRaceId
      ? { leagueId, raceId: effectiveRaceId }
      : 'skip',
  );
  const weekendH2H = useQuery(
    api.leaderboards.getLeagueH2HRaceLeaderboard,
    timeScope === 'weekend' && gameMode === 'h2h' && effectiveRaceId
      ? { leagueId, raceId: effectiveRaceId }
      : 'skip',
  );

  // Sticky values — retain last result so switching back to a tab is instant
  const stickySeasonTop5 = useStickyValue(seasonTop5);
  const stickySeasonCombined = useStickyValue(seasonCombined);
  const stickySeasonH2H = useStickyValue(seasonH2H);
  const stickyWeekendTop5 = useStickyValue(weekendTop5);
  const stickyWeekendCombined = useStickyValue(weekendCombined);
  const stickyWeekendH2H = useStickyValue(weekendH2H);

  const activeLeaderboard = (() => {
    if (timeScope === 'season') {
      return gameMode === 'top5'
        ? stickySeasonTop5
        : gameMode === 'combined'
          ? stickySeasonCombined
          : stickySeasonH2H;
    }
    return gameMode === 'top5'
      ? stickyWeekendTop5
      : gameMode === 'combined'
        ? stickyWeekendCombined
        : stickyWeekendH2H;
  })();

  const showPredictionStatus =
    nextRace?.status === 'upcoming' &&
    (timeScope !== 'weekend' || effectiveRaceId === nextRace._id);
  const members = useQuery(api.leagues.getLeagueMembers, {
    leagueId,
    raceId: showPredictionStatus ? nextRace._id : undefined,
  });
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const followMutation = useMutation(api.follows.follow);
  const unfollowMutation = useMutation(api.follows.unfollow);
  const [optimisticFollows, setOptimisticFollows] = useState<
    Map<string, boolean>
  >(new Map());

  const filterControls = (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface-muted/50 p-1.5">
      <TabSwitch
        value={timeScope}
        onChange={(v) =>
          navigate({
            search: (prev) => ({ ...prev, time: v }),
            replace: true,
          })
        }
        options={TIME_SCOPE_OPTIONS}
        className="flex gap-1"
        buttonClassName="flex-1"
        ariaLabel="Standings time scope"
      />
      {timeScope === 'weekend' && selectableRaces.length > 1 && (
        <div className="relative">
          <select
            value={effectiveRaceId ?? ''}
            onChange={(e) =>
              navigate({
                search: (prev) => ({ ...prev, raceId: e.target.value }),
                replace: true,
              })
            }
            className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 pr-10 text-sm font-medium text-text focus:ring-2 focus:ring-accent focus:outline-none"
            aria-label="Select race weekend"
          >
            {selectableRaces.map((r) => (
              <option key={r._id} value={r._id}>
                {r.season} Round {r.round} · {r.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      )}
      <TabSwitch
        value={gameMode}
        onChange={(v) =>
          navigate({
            search: (prev) => ({ ...prev, mode: v }),
            replace: true,
          })
        }
        options={GAME_MODE_OPTIONS}
        className="flex gap-1"
        buttonClassName="flex-1"
        ariaLabel="Standings game mode"
      />
    </div>
  );

  if (members === undefined || activeLeaderboard === undefined) {
    return (
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-text">Members</h2>
        {filterControls}
        <div className="animate-pulse">
          <div className="mb-3 h-5 w-72 rounded bg-surface-muted" />
          <div className="mb-3 h-4 w-56 rounded bg-surface-muted" />
        </div>
        <LeagueMembersListSkeleton />
      </div>
    );
  }

  // Extract entries from either a season result ({ entries }) or a race result ({ status, entries })
  type AnyEntry = {
    userId: string;
    rank: number;
    points: number;
    top5Points?: number;
    h2hPoints?: number;
    correctPicks?: number;
    totalPicks?: number;
    isViewer?: boolean;
  };

  // Use timeScope to cast to the appropriate result shape, avoiding type-narrowing issues
  const weekendLeaderboard =
    timeScope === 'weekend'
      ? (activeLeaderboard as {
          status: 'visible' | 'locked';
          reason: string | null;
          entries: AnyEntry[];
        })
      : null;
  const seasonLeaderboard =
    timeScope === 'season'
      ? (activeLeaderboard as {
          entries: AnyEntry[];
          viewerEntry: { rank: number; points: number } | null;
        })
      : null;

  const activeEntries: AnyEntry[] =
    weekendLeaderboard?.status === 'visible'
      ? weekendLeaderboard.entries
      : (seasonLeaderboard?.entries ?? []);

  const isWeekendLocked = weekendLeaderboard?.status === 'locked';

  const viewerEntry = (() => {
    if (weekendLeaderboard?.status === 'visible') {
      return weekendLeaderboard.entries.find((e) => e.isViewer) ?? null;
    }
    return seasonLeaderboard?.viewerEntry ?? null;
  })();

  const followedSet = new Set(followedIds ?? []);
  const standingsByUserId = new Map(
    activeEntries.map((entry) => [String(entry.userId), entry] as const),
  );

  const memberItems = members.map((member) => {
    const standing = standingsByUserId.get(String(member.userId));
    const optimistic = optimisticFollows.get(member.userId as string);
    const isFollowing =
      optimistic !== undefined
        ? optimistic
        : followedIds !== undefined
          ? followedSet.has(member.userId as string)
          : undefined;
    return {
      ...member,
      _id: member._id as string,
      userId: member.userId as string,
      isViewer: me?._id === member.userId,
      isFollowing,
      rank: standing?.rank,
      points: standing?.points,
      top5Points: standing?.top5Points,
      h2hPoints: standing?.h2hPoints,
      correctPicks: standing?.correctPicks,
      totalPicks: standing?.totalPicks,
    };
  });

  memberItems.sort((a, b) => {
    if (a.rank != null && b.rank != null) {
      return a.rank - b.rank;
    }
    if (a.rank != null) {
      return -1;
    }
    if (b.rank != null) {
      return 1;
    }
    if (a.role !== b.role) {
      return a.role === 'admin' ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  async function handleFollow(userId: string) {
    setOptimisticFollows((prev) => new Map(prev).set(userId, true));
    try {
      await followMutation({ followeeId: userId as Id<'users'> });
    } catch {
      setOptimisticFollows((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  async function handleUnfollow(userId: string) {
    setOptimisticFollows((prev) => new Map(prev).set(userId, false));
    try {
      await unfollowMutation({ followeeId: userId as Id<'users'> });
    } catch {
      setOptimisticFollows((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  const viewerRankLabel = (() => {
    if (!viewerEntry) {
      return null;
    }
    const modeLabel =
      gameMode === 'combined'
        ? 'Combined'
        : gameMode === 'top5'
          ? 'Top 5'
          : 'H2H';
    const scopeLabel =
      timeScope === 'weekend' ? 'this race weekend' : 'this league';
    return {
      rank: viewerEntry.rank,
      points: viewerEntry.points,
      modeLabel,
      scopeLabel,
    };
  })();

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-lg font-semibold text-text">
        Members ({members.length})
      </h2>

      {filterControls}

      {viewerRankLabel && (
        <p className="mb-3 text-sm text-text-muted">
          You&apos;re currently{' '}
          <span className="font-semibold text-accent">
            #{viewerRankLabel.rank}
          </span>{' '}
          ({viewerRankLabel.modeLabel}) in {viewerRankLabel.scopeLabel} with{' '}
          <span className="font-semibold text-accent">
            {viewerRankLabel.points} pts
          </span>
          .
        </p>
      )}
      {isWeekendLocked && (
        <p className="mb-3 text-sm text-text-muted">
          Submit your picks to unlock the race weekend standings.
        </p>
      )}
      {!isWeekendLocked && activeEntries.length === 0 && (
        <p className="mb-3 text-sm text-text-muted">
          No scores yet. Rankings will appear here once race results are
          published.
        </p>
      )}
      {showPredictionStatus && (
        <p className="mb-3 text-xs text-text-muted">
          Predictions stay hidden until this race locks.
        </p>
      )}
      <LeagueMembersList
        members={memberItems}
        showPredictionStatus={showPredictionStatus}
        gameMode={gameMode}
        renderProfileLink={({ username, className, children }) => (
          <Link
            to="/p/$username"
            params={{ username }}
            search={{ from: `/leagues/${slug}`, fromLabel: leagueName }}
            className={className}
          >
            {children}
          </Link>
        )}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />
    </div>
  );
}
