import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowRight, Check, Timer, Trophy, Users } from 'lucide-react';

import { Avatar } from './Avatar';
import { Button } from './Button/Button';
import { Flag } from './Flag';
import { FollowButton } from './FollowButton';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { useCountdown } from '@/lib/date';
import { getNextSessionLockAt } from '@/lib/raceSessions';
import { useNow } from '@/lib/testing/now';

function CountdownLine({ lockAt }: { lockAt: number }) {
  const label = useCountdown(lockAt);
  return (
    <p
      suppressHydrationWarning
      className="flex items-center gap-1.5 text-xs text-text-muted"
    >
      <Timer className="h-3.5 w-3.5 shrink-0 text-accent" />
      <span className="tabular-nums">
        <span className="font-semibold text-text">{label}</span> to predict
      </span>
    </p>
  );
}

function NextRaceCard() {
  const nextRace = useQuery(api.races.getNextRace, {});
  const myPredictions = useQuery(
    api.predictions.myWeekendPredictions,
    nextRace ? { raceId: nextRace._id } : 'skip',
  );
  const now = useNow();

  if (nextRace === undefined) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-5 w-40 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-9 w-full animate-pulse rounded bg-surface-muted" />
      </div>
    );
  }

  if (!nextRace) {
    return null;
  }

  const countryCode = getCountryCodeForRace({ slug: nextRace.slug });
  const isOpen = nextRace.predictionLockAt > now;
  const hasAnyPick =
    myPredictions != null &&
    Object.values(myPredictions.predictions).some((picks) => picks != null);

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] font-semibold tracking-wide text-accent uppercase">
        {isOpen ? 'Picks open' : 'Up next'}
      </p>
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug: nextRace.slug }}
        className="group mt-1.5 flex items-center gap-2"
      >
        {countryCode ? (
          <Flag
            code={countryCode}
            size="md"
            className="overflow-hidden rounded-sm border border-border shadow-sm"
          />
        ) : null}
        <span className="font-title min-w-0 flex-1 truncate text-sm font-bold text-text group-hover:text-accent">
          {nextRace.name}
        </span>
      </Link>
      {isOpen ? (
        <div className="mt-2.5">
          <CountdownLine lockAt={getNextSessionLockAt(nextRace, now)} />
        </div>
      ) : null}
      <Button
        asChild
        variant={hasAnyPick ? 'secondary' : 'primary'}
        size="sm"
        leftIcon={hasAnyPick ? Check : undefined}
        rightIcon={hasAnyPick ? undefined : ArrowRight}
        className="mt-3 w-full"
      >
        <Link to="/races/$raceSlug" params={{ raceSlug: nextRace.slug }}>
          {hasAnyPick ? 'Edit picks' : 'Make picks'}
        </Link>
      </Button>
    </div>
  );
}

function MyLeaguesCard() {
  const leaguesRaw = useQuery(api.leagues.getMyLeagues);

  if (leaguesRaw === undefined) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 space-y-2">
          <div className="h-9 w-full animate-pulse rounded bg-surface-muted" />
          <div className="h-9 w-full animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    );
  }

  const leagues = leaguesRaw.filter(
    (league): league is NonNullable<typeof league> => league != null,
  );

  if (leagues.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-text-muted" />
          <h2 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Your leagues
          </h2>
        </div>
        <p className="text-xs text-text-muted">
          Join or create a league to compete with friends.
        </p>
        <Link
          to="/leagues"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
        >
          Browse leagues
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const visible = leagues.slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-text-muted" />
          <h2 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Your leagues
          </h2>
        </div>
        {leagues.length > visible.length && (
          <Link
            to="/leagues"
            className="text-[11px] font-semibold text-accent hover:text-accent-hover"
          >
            See all
          </Link>
        )}
      </div>
      <ul className="space-y-1">
        {visible.map((league) => (
          <li key={league._id}>
            <Link
              to="/leagues/$slug"
              params={{ slug: league.slug }}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-muted/60"
            >
              <span className="truncate font-medium text-text">
                {league.name}
              </span>
              <span className="shrink-0 text-[11px] text-text-muted tabular-nums">
                {league.memberCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuggestedFollowsCard() {
  const suggested = useQuery(api.follows.getSuggestedLeagueMembersToFollow, {
    limit: 3,
  });

  if (suggested === undefined) {
    return null;
  }

  if (suggested.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5 text-text-muted" />
        <h2 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
          Players to follow
        </h2>
      </div>
      <ul className="space-y-2">
        {suggested.map((user) => (
          <li key={user._id} className="flex items-center gap-2">
            <Link
              to="/p/$username"
              params={{ username: user.username }}
              search={{ from: undefined, fromLabel: undefined }}
              className="shrink-0"
            >
              <Avatar
                avatarUrl={user.avatarUrl}
                username={user.username}
                size="sm"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                to="/p/$username"
                params={{ username: user.username }}
                search={{ from: undefined, fromLabel: undefined }}
                className="block truncate text-sm font-semibold text-text hover:text-accent"
              >
                {user.displayName}
              </Link>
              <p className="truncate text-[11px] text-text-muted">
                {user.sharedLeagueNames.length > 0
                  ? user.sharedLeagueNames.join(', ')
                  : `${user.sharedLeagueCount} shared leagues`}
              </p>
            </div>
            <FollowButton followeeId={user._id} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeedSidebar() {
  return (
    <aside className="space-y-4">
      <NextRaceCard />
      <MyLeaguesCard />
      <SuggestedFollowsCard />
    </aside>
  );
}
