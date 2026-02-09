import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useQuery } from 'convex/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Globe,
  Loader2,
  Medal,
  Swords,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { ogBaseUrl } from '../lib/site';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

const PODIUM_SIZE = 3;
const PAGE_SIZE = 50;

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
  loader: async () => {
    const leaderboard = await convex.query(
      api.leaderboards.getSeasonLeaderboard,
      { limit: PODIUM_SIZE },
    );
    return { initialLeaderboard: leaderboard };
  },
  head: () => {
    const title =
      '2026 Season Leaderboard - F1 Prediction Rankings | Grand Prix Picks';
    const description =
      'See who tops the 2026 F1 prediction standings. Track your ranking, compare scores, and compete with friends across every race weekend.';
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: `${ogBaseUrl}/og/leaderboard.png` },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${ogBaseUrl}/og/leaderboard.png` },
      ],
    };
  },
});

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  points: number;
  raceCount: number;
  isViewer: boolean;
};

type H2HLeaderboardEntry = LeaderboardEntry & {
  correctPicks: number;
  totalPicks: number;
};

type Scope = 'global' | 'following';
type GameMode = 'top5' | 'h2h';

function LeaderboardPage() {
  const { initialLeaderboard } = Route.useLoaderData();
  const [scope, setScope] = useState<Scope>('global');
  const [gameMode, setGameMode] = useState<GameMode>('top5');

  // Top 5 global leaderboard state (with SSR + pagination)
  const [entries, setEntries] = useState<Array<LeaderboardEntry>>(
    initialLeaderboard.entries,
  );
  const [offset, setOffset] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(initialLeaderboard.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isGlobalTop5 = scope === 'global' && gameMode === 'top5';

  const clientLeaderboard = useQuery(
    api.leaderboards.getSeasonLeaderboard,
    isGlobalTop5 ? { limit: PAGE_SIZE } : 'skip',
  );
  const globalH2HData = useQuery(
    api.h2h.getH2HSeasonLeaderboard,
    scope === 'global' && gameMode === 'h2h' ? { limit: PAGE_SIZE } : 'skip',
  );
  const friendsTop5Data = useQuery(
    api.leaderboards.getFriendsLeaderboard,
    scope === 'following' && gameMode === 'top5' ? { limit: PAGE_SIZE } : 'skip',
  );
  const friendsH2HData = useQuery(
    api.leaderboards.getFriendsH2HLeaderboard,
    scope === 'following' && gameMode === 'h2h' ? { limit: PAGE_SIZE } : 'skip',
  );

  const data = clientLeaderboard ?? initialLeaderboard;

  // Viewer entry for header summary (changes by tab)
  const headerViewerEntry =
    scope === 'global' && gameMode === 'top5'
      ? data.viewerEntry
      : scope === 'global' && gameMode === 'h2h'
        ? (globalH2HData?.viewerEntry as H2HLeaderboardEntry | null)
        : scope === 'following' && gameMode === 'top5'
          ? friendsTop5Data?.viewerEntry
          : scope === 'following' && gameMode === 'h2h'
            ? (friendsH2HData?.viewerEntry as H2HLeaderboardEntry | null)
            : null;
  const isH2HTab = gameMode === 'h2h';

  useEffect(() => {
    if (clientLeaderboard && offset === PAGE_SIZE) {
      setEntries(clientLeaderboard.entries);
      setHasMore(clientLeaderboard.hasMore);
    }
  }, [clientLeaderboard, offset]);

  const totalCount = data.totalCount;

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const more = await convex.query(api.leaderboards.getSeasonLeaderboard, {
        limit: PAGE_SIZE,
        offset,
      });
      setEntries((prev) => [...prev, ...more.entries]);
      setOffset((prev) => prev + PAGE_SIZE);
      setHasMore(more.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  }, [offset, hasMore, isLoadingMore]);

  const podiumEntries = entries.slice(0, 3);
  const tableEntries = entries.slice(3);

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header + contextual result for current tab */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-text">Leaderboard</h1>
            <p className="text-text-muted">
              2026 Season Standings · {totalCount.toLocaleString()} players
            </p>
          </div>

          <AnimatePresence mode="wait">
            {headerViewerEntry ? (
              <motion.div
                key={`${scope}-${gameMode}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="flex shrink-0 items-center gap-3 rounded-lg border-2 border-accent bg-accent-muted px-3 py-2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                  {headerViewerEntry.rank}
                </span>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-text">
                    <User className="h-3 w-3 text-accent" />
                    {isH2HTab ? 'Your H2H Rank' : 'Your Rank'}
                  </div>
                  <div className="text-base font-bold text-accent">
                    {headerViewerEntry.points} pts
                    {isH2HTab &&
                      'correctPicks' in headerViewerEntry &&
                      headerViewerEntry.totalPicks != null && (
                        <span className="ml-2 text-sm font-normal text-text-muted">
                          ({headerViewerEntry.correctPicks}/{headerViewerEntry.totalPicks} correct)
                        </span>
                      )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/50 p-1.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex gap-1 sm:border-r sm:border-border sm:pr-4">
            <Button
              variant="tab"
              size="tab"
              active={scope === 'global'}
              onClick={() => setScope('global')}
              className="flex-1 sm:flex-initial"
            >
              <Globe className="h-4 w-4" />
              Global
            </Button>
            <Button
              variant="tab"
              size="tab"
              active={scope === 'following'}
              onClick={() => setScope('following')}
              className="flex-1 sm:flex-initial"
            >
              <Users className="h-4 w-4" />
              Following
            </Button>
          </div>
          <div className="flex flex-1 gap-1">
            <Button
              variant="tab"
              size="tab"
              active={gameMode === 'top5'}
              onClick={() => setGameMode('top5')}
              className="flex-1"
            >
              <Trophy className="h-4 w-4" />
              Top 5
            </Button>
            <Button
              variant="tab"
              size="tab"
              active={gameMode === 'h2h'}
              onClick={() => setGameMode('h2h')}
              className="flex-1"
            >
              <Swords className="h-4 w-4" />
              Head to Head
            </Button>
          </div>
        </div>

        {/* Content */}
        {scope === 'following' ? (
          gameMode === 'top5' ? (
            <FollowingTop5Content />
          ) : (
            <FollowingH2HContent />
          )
        ) : gameMode === 'h2h' ? (
          <GlobalH2HContent />
        ) : (
          <>
            {entries.length === 0 ? (
              <div
                className="rounded-xl border border-border bg-surface p-8 text-center"
                data-testid="leaderboard-empty"
              >
                <Trophy className="mx-auto mb-4 h-16 w-16 text-text-muted" />
                <h2 className="mb-2 text-xl font-semibold text-text">
                  No scores yet
                </h2>
                <p className="text-text-muted">
                  The leaderboard will populate once race results are published.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {podiumEntries.length >= 3 && (
                  <div className="mb-6 grid grid-cols-3 gap-3">
                    <PodiumCard entry={podiumEntries[1]} place={2} />
                    <PodiumCard entry={podiumEntries[0]} place={1} />
                    <PodiumCard entry={podiumEntries[2]} place={3} />
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                          Player
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                          Races
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableEntries.length > 0
                        ? tableEntries.map((entry) => (
                            <LeaderboardRow key={entry.userId} entry={entry} />
                          ))
                        : !clientLeaderboard &&
                          hasMore &&
                          Array.from({ length: 10 }, (_, i) => (
                            <SkeletonRow key={i} />
                          ))}
                    </tbody>
                  </table>

                  {!hasMore && entries.length <= 3 && entries.length > 0 && (
                    <SmallLeaderboard entries={entries} />
                  )}
                </div>

                <div className="flex min-h-[3rem] flex-col items-center justify-center py-4">
                  {hasMore && (
                    <button
                      type="button"
                      disabled={isLoadingMore}
                      onClick={() => void loadMore()}
                      className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-surface-muted disabled:hover:text-text-muted"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          <span>Loading...</span>
                        </>
                      ) : (
                        'Load more'
                      )}
                    </button>
                  )}
                  {!hasMore && entries.length > PAGE_SIZE && (
                    <p className="text-sm text-text-muted">
                      You've reached the end · {totalCount.toLocaleString()}{' '}
                      players
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────── Global H2H ────────────────────

function GlobalH2HContent() {
  const h2hData = useQuery(api.h2h.getH2HSeasonLeaderboard, {
    limit: PAGE_SIZE,
  });

  if (h2hData === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const entries = h2hData.entries as Array<H2HLeaderboardEntry>;
  const podiumEntries = entries.slice(0, 3);
  const tableEntries = entries.slice(3);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Swords className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">
          No H2H scores yet
        </h2>
        <p className="text-text-muted">
          Head-to-head scores will appear once race results are published.
        </p>
      </div>
    );
  }

  return (
    <H2HLeaderboardLayout
      entries={entries}
      podiumEntries={podiumEntries}
      tableEntries={tableEntries}
    />
  );
}

// ──────────────────── Following: shared guard & empty state ────────────────────

function FollowingGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">
          Sign in to see your friends
        </h2>
        <p className="mb-4 text-text-muted">
          Follow other players to compete against them on a private leaderboard.
        </p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  return <>{children}</>;
}

function FollowingEmptyState() {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center">
      <Users className="mx-auto mb-4 h-16 w-16 text-text-muted" />
      <h2 className="mb-2 text-xl font-semibold text-text">No one here yet</h2>
      <p className="mb-4 text-text-muted">
        Follow other players from their profile to see them on this leaderboard.
      </p>
      <p className="text-sm text-text-muted">
        Browse the global leaderboard to find players to follow.
      </p>
    </div>
  );
}

// ──────────────────── Following Top 5 ────────────────────

function FollowingTop5Content() {
  return (
    <FollowingGuard>
      <FollowingTop5Inner />
    </FollowingGuard>
  );
}

function FollowingTop5Inner() {
  const data = useQuery(api.leaderboards.getFriendsLeaderboard, {
    limit: PAGE_SIZE,
  });

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const entries = data.entries;

  if (entries.length === 0) {
    return <FollowingEmptyState />;
  }

  const podiumEntries = entries.slice(0, 3);
  const tableEntries = entries.slice(3);

  return (
    <div className="space-y-3">
      {podiumEntries.length >= 3 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <PodiumCard entry={podiumEntries[1]} place={2} />
          <PodiumCard entry={podiumEntries[0]} place={1} />
          <PodiumCard entry={podiumEntries[2]} place={3} />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Player
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                Races
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {tableEntries.length > 0
              ? tableEntries.map((entry) => (
                  <LeaderboardRow key={entry.userId} entry={entry} />
                ))
              : null}
          </tbody>
        </table>

        {entries.length <= 3 && entries.length > 0 && (
          <SmallLeaderboard entries={entries} />
        )}
      </div>
    </div>
  );
}

// ──────────────────── Following H2H ────────────────────

function FollowingH2HContent() {
  return (
    <FollowingGuard>
      <FollowingH2HInner />
    </FollowingGuard>
  );
}

function FollowingH2HInner() {
  const data = useQuery(api.leaderboards.getFriendsH2HLeaderboard, {
    limit: PAGE_SIZE,
  });

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const entries = data.entries as Array<H2HLeaderboardEntry>;

  if (entries.length === 0) {
    return <FollowingEmptyState />;
  }

  const podiumEntries = entries.slice(0, 3);
  const tableEntries = entries.slice(3);

  return (
    <H2HLeaderboardLayout
      entries={entries}
      podiumEntries={podiumEntries}
      tableEntries={tableEntries}
    />
  );
}

// ───────────────────────── Shared H2H Layout ─────────────────────────

function H2HLeaderboardLayout({
  entries,
  podiumEntries,
  tableEntries,
}: {
  entries: Array<H2HLeaderboardEntry>;
  podiumEntries: Array<H2HLeaderboardEntry>;
  tableEntries: Array<H2HLeaderboardEntry>;
}) {
  return (
    <div className="space-y-3">
      {podiumEntries.length >= 3 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <PodiumCard entry={podiumEntries[1]} place={2} />
          <PodiumCard entry={podiumEntries[0]} place={1} />
          <PodiumCard entry={podiumEntries[2]} place={3} />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Player
              </th>
              <th className="hidden px-4 py-3 text-right text-sm font-semibold text-text-muted sm:table-cell">
                Accuracy
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {tableEntries.length > 0
              ? tableEntries.map((entry) => (
                  <H2HTableRow key={entry.userId} entry={entry} />
                ))
              : null}
          </tbody>
        </table>

        {entries.length <= 3 && entries.length > 0 && (
          <SmallLeaderboard entries={entries} />
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Shared Components ─────────────────────────

function H2HTableRow({ entry }: { entry: H2HLeaderboardEntry }) {
  const navigate = useNavigate();
  return (
    <tr
      role="link"
      tabIndex={0}
      className={`cursor-pointer border-b border-border transition-colors last:border-0 ${
        entry.isViewer
          ? 'bg-accent-muted hover:bg-accent-muted'
          : 'hover:bg-surface-muted'
      }`}
      onClick={() =>
        navigate({ to: '/p/$username', params: { username: entry.username } })
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate({
            to: '/p/$username',
            params: { username: entry.username },
          });
        }
      }}
    >
      <td className="px-4 py-3">
        <span
          className={`font-medium ${entry.isViewer ? 'text-accent' : 'text-text-muted'}`}
        >
          {entry.rank}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2 font-medium text-text">
          {entry.isViewer && <User className="h-4 w-4 text-accent" />}
          <span className="font-semibold text-accent">{entry.username}</span>
          {entry.isViewer && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </span>
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell">
        <span className="text-sm text-text-muted">
          {entry.correctPicks}/{entry.totalPicks}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-bold text-accent">{entry.points}</span>
      </td>
    </tr>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const navigate = useNavigate();
  return (
    <tr
      role="link"
      tabIndex={0}
      className={`cursor-pointer border-b border-border transition-colors last:border-0 ${
        entry.isViewer
          ? 'bg-accent-muted hover:bg-accent-muted'
          : 'hover:bg-surface-muted'
      }`}
      data-testid="leaderboard-entry"
      onClick={() =>
        navigate({ to: '/p/$username', params: { username: entry.username } })
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate({
            to: '/p/$username',
            params: { username: entry.username },
          });
        }
      }}
    >
      <td className="px-4 py-3" data-testid="position">
        <span
          className={`font-medium ${entry.isViewer ? 'text-accent' : 'text-text-muted'}`}
        >
          {entry.rank}
        </span>
      </td>
      <td className="px-4 py-3" data-testid="username">
        <span className="flex items-center gap-2 font-medium text-text">
          {entry.isViewer && <User className="h-4 w-4 text-accent" />}
          <span className="font-semibold text-accent">{entry.username}</span>
          {entry.isViewer && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-text-muted">{entry.raceCount}</span>
      </td>
      <td className="px-4 py-3 text-right" data-testid="points">
        <span className="font-bold text-accent">{entry.points}</span>
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3">
        <div className="h-4 w-6 animate-pulse rounded bg-border" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-border" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-4 w-6 animate-pulse rounded bg-border" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-4 w-10 animate-pulse rounded bg-border" />
      </td>
    </tr>
  );
}

function SmallLeaderboard({ entries }: { entries: Array<LeaderboardEntry> }) {
  return (
    <div className="p-4">
      {entries.map((entry) => (
        <Link
          key={entry.userId}
          to="/p/$username"
          params={{ username: entry.username }}
          className={`flex cursor-pointer items-center justify-between border-b border-border py-2 transition-colors last:border-0 hover:opacity-90 ${
            entry.isViewer ? 'rounded-lg bg-accent-muted px-2' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                entry.isViewer
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {entry.rank}
            </span>
            <span className="flex items-center gap-2 font-medium text-text">
              <span className="font-semibold text-accent">
                {entry.username}
              </span>
              {entry.isViewer && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  YOU
                </span>
              )}
            </span>
          </div>
          <div className="text-right">
            <div className="font-bold text-accent">{entry.points} pts</div>
            <div className="text-xs text-text-muted">
              {entry.raceCount} race{entry.raceCount !== 1 ? 's' : ''}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PodiumCard({
  entry,
  place,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
}) {
  const isFirst = place === 1;
  const marginTop = place === 1 ? '' : place === 2 ? 'mt-8' : 'mt-12';

  const borderStyle = entry.isViewer
    ? 'border-accent bg-accent-muted ring-2 ring-accent'
    : isFirst
      ? 'border-warning/30 bg-surface'
      : 'border-border bg-surface';

  const Icon = isFirst ? Trophy : Medal;
  const iconColor = isFirst
    ? 'text-warning'
    : place === 2
      ? 'text-text-muted'
      : 'text-warning';
  const bgColor = isFirst
    ? 'bg-warning-muted'
    : place === 2
      ? 'bg-surface-muted'
      : 'bg-warning-muted';
  const textColor = isFirst
    ? 'text-warning'
    : place === 2
      ? 'text-text-muted'
      : 'text-warning';
  const placeLabels = { 1: '1st', 2: '2nd', 3: '3rd' };

  return (
    <Link
      to="/p/$username"
      params={{ username: entry.username }}
      className={`${marginTop} block cursor-pointer rounded-xl border p-4 text-center transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg ${borderStyle}`}
    >
      <div
        className={`mx-auto mb-2 flex items-center justify-center rounded-full ${bgColor} ${
          isFirst ? 'h-14 w-14' : 'h-12 w-12'
        }`}
      >
        <Icon className={`${isFirst ? 'h-8 w-8' : 'h-6 w-6'} ${iconColor}`} />
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>
        {placeLabels[place]}
      </div>
      <div
        className={`mt-1 flex items-center justify-center gap-1.5 truncate ${
          isFirst ? 'font-semibold' : 'font-medium'
        }`}
      >
        {entry.isViewer && <User className="h-4 w-4 text-accent" />}
        <span className="font-semibold text-accent">{entry.username}</span>
        {entry.isViewer && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
            YOU
          </span>
        )}
      </div>
      <div
        className={`${isFirst ? 'text-xl' : 'text-lg'} font-bold text-accent`}
      >
        {entry.points} pts
      </div>
      <div className="text-xs text-text-muted">
        {entry.raceCount} race{entry.raceCount !== 1 ? 's' : ''}
      </div>
    </Link>
  );
}
