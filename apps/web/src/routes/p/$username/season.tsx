import { convexQuery } from '@convex-dev/react-query';
import { api } from '@convex-generated/api';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, User } from 'lucide-react';
import type { CSSProperties } from 'react';

import { Avatar } from '@/components/Avatar';
import { Button, primaryButtonStyles } from '@/components/Button/Button';
import { NoticeCard } from '@/components/NoticeCard';
import { PageLoader } from '@/components/PageLoader';
import { RaceFlag } from '@/components/RaceFlag';
import { ShareOnXButton } from '@/components/ShareOnXButton';
import { SharePicksButton } from '@/components/SharePicksButton';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { SESSION_LABELS } from '@/lib/sessions';
import { buildSeasonRecapShareText } from '@/lib/share';
import { pageMeta, seasonRecapOgImageUrl, siteConfig } from '@/lib/site';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

export const Route = createFileRoute('/p/$username/season')({
  validateSearch: (search: Record<string, unknown>) => ({
    season:
      typeof search.season === 'string' && /^\d{4}$/.test(search.season)
        ? Number(search.season)
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ season: search.season }),
  loader: async ({ context, params, deps }) => {
    const recap = await context.queryClient.ensureQueryData(
      convexQuery(api.seasonRecap.getSeasonRecap, {
        username: params.username,
        season: deps.season,
      }),
    );
    if (!recap) {
      throw notFound();
    }
    return { recap };
  },
  head: ({ loaderData, params }) => {
    const recap = loaderData?.recap;
    const name = recap ? resolveDisplayName(recap.player) : params.username;
    const season = recap?.season ?? new Date().getUTCFullYear();
    const suffix = recap && !recap.seasonComplete ? ' so far' : '';
    const title = `${name}'s ${season} season${suffix} | Grand Prix Picks`;
    return pageMeta({
      title,
      description: recap
        ? `${recap.topFive.points} points from ${recap.topFive.weekendsScored} ${
            recap.topFive.weekendsScored === 1 ? 'weekend' : 'weekends'
          } of F1 predictions on Grand Prix Picks.`
        : `${name}'s F1 prediction season on Grand Prix Picks.`,
      path: `/p/${params.username}/season`,
      image: seasonRecapOgImageUrl(params.username, season),
      imageAlt: `${name}'s ${season} season on Grand Prix Picks`,
      // One per player, same template: the profile is noindex for the same
      // reason and this page inherits it.
      noIndex: true,
    });
  },
  component: SeasonRecapPage,
});

function teamStyle(team: string | null) {
  return {
    '--team-colour': (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR,
  } as CSSProperties;
}

function Stat({
  value,
  label,
  accent = false,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface px-3 py-4 text-center">
      <div
        className={`font-title text-2xl font-semibold ${accent ? 'text-accent' : 'text-text'}`}
      >
        {value}
      </div>
      <div className="text-xs font-semibold tracking-label text-text-muted uppercase">
        {label}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="font-title mb-2 text-sm font-semibold text-text">
      {children}
    </h2>
  );
}

/**
 * The scoring bands of every pick in the season as one bar, in the same
 * purple / green / yellow / red the pick slots use, so a player who knows the
 * score card reads it without a key. The counts beneath are the key anyway.
 */
function PickBands({
  exact,
  near,
  topFive,
  total,
}: {
  exact: number;
  near: number;
  topFive: number;
  total: number;
}) {
  const misses = total - exact - near - topFive;
  const bands = [
    { count: exact, label: 'Exact', className: 'bg-result-exact' },
    { count: near, label: 'One off', className: 'bg-result-near' },
    { count: topFive, label: 'In the top 5', className: 'bg-result-top5' },
    { count: misses, label: 'Missed', className: 'bg-racing-red' },
  ];
  return (
    <div>
      <div
        className="flex h-2 gap-px overflow-hidden rounded-xs"
        role="img"
        aria-label={`${exact} exact, ${near} one off, ${topFive} in the top 5, ${misses} missed`}
      >
        {bands.map((band) =>
          band.count > 0 ? (
            <div
              key={band.label}
              className={band.className}
              style={{ flexGrow: band.count }}
            />
          ) : null,
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {bands.map((band) => (
          <div key={band.label} className="flex items-baseline gap-2">
            <dt className="flex items-center gap-1.5 text-xs text-text-muted">
              <span
                className={`inline-block h-2 w-2 rounded-xs ${band.className}`}
                aria-hidden="true"
              />
              {band.label}
            </dt>
            <dd className="gpp-mono text-sm font-semibold text-text">
              {band.count}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SeasonRecapPage() {
  const { username } = Route.useParams();
  const { season } = Route.useSearch();
  const { recap: initialRecap } = Route.useLoaderData();

  const { data: liveRecap } = useQuery(
    convexQuery(api.seasonRecap.getSeasonRecap, { username, season }),
  );
  // `undefined` is "not loaded yet"; a live `null` means the player was
  // renamed or deleted and must not fall back to the loader's copy.
  const recap = liveRecap === undefined ? initialRecap : liveRecap;

  if (recap === undefined) {
    return <PageLoader />;
  }

  if (recap === null) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <NoticeCard
            level="page"
            icon={User}
            title="User not found"
            description={
              <>No user with the username &quot;{username}&quot; exists.</>
            }
            action={
              <Link to="/leaderboard" className={primaryButtonStyles('sm')}>
                View Leaderboard
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const name = resolveDisplayName(recap.player);
  const { topFive, h2h, bestWeekend, bestSession, mostBacked, weekends } =
    recap;
  const title = `${name}'s ${recap.season} season${recap.seasonComplete ? '' : ' so far'}`;
  const pageUrl = `${siteConfig.url}/p/${username}/season?season=${recap.season}`;
  const shareText = buildSeasonRecapShareText({
    season: recap.season,
    points: topFive.points,
    rank: topFive.rank,
    players: topFive.players,
    bestWeekend,
    seasonComplete: recap.seasonComplete,
    accountHandle: siteConfig.social.x.handle,
  });
  const maxWeekendPoints = Math.max(
    1,
    ...weekends.map((weekend) => weekend.points),
  );
  const bestWeekendCountry = bestWeekend
    ? getCountryCodeForRace({ slug: bestWeekend.raceSlug })
    : undefined;

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Button
          asChild
          size="sm"
          variant="text"
          leftIcon={ArrowLeft}
          className="mb-4"
        >
          <Link
            to="/p/$username"
            params={{ username }}
            search={{ from: undefined, fromLabel: undefined }}
          >
            Back to profile
          </Link>
        </Button>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Avatar
              avatarUrl={recap.player.avatarUrl}
              username={recap.player.username}
              size="lg"
            />
            <div className="min-w-0">
              <h1 className="font-title text-xl font-semibold text-text sm:text-2xl lg:text-3xl">
                {title}
              </h1>
              <p className="text-sm text-text-muted">
                {recap.seasonComplete
                  ? `${recap.roundsInSeason} rounds`
                  : `${recap.roundsFinished} of ${recap.roundsInSeason} rounds run`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SharePicksButton
              appearance="outline"
              text={shareText}
              url={pageUrl}
              analyticsProps={{ surface: 'season_recap' }}
            />
            <ShareOnXButton
              text={shareText}
              url={pageUrl}
              analyticsEvent="season_recap_shared_x"
              analyticsProps={{ season: recap.season }}
            />
          </div>
        </div>

        <div className="mb-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4">
          <Stat value={topFive.points} label="Top 5 points" accent />
          <Stat
            value={topFive.rank === null ? '—' : `P${topFive.rank}`}
            label={
              topFive.rank === null
                ? 'Top 5 rank'
                : `Top 5 rank of ${topFive.players}`
            }
          />
          <Stat
            value={topFive.weekendsScored}
            label={`of ${recap.roundsInSeason} weekends`}
          />
          <Stat
            value={h2h ? `${h2h.correct}/${h2h.total}` : '—'}
            label={
              h2h && h2h.rank !== null
                ? `Duels · P${h2h.rank} of ${h2h.players}`
                : 'Duels'
            }
          />
        </div>

        {weekends.length === 0 ? (
          <p className="text-sm text-text-muted">No scored weekends yet.</p>
        ) : (
          <>
            <div className="mb-7 grid gap-7 sm:grid-cols-2">
              {bestWeekend ? (
                <section>
                  <SectionHeading>Best weekend</SectionHeading>
                  <Link
                    to="/races/$raceSlug"
                    params={{ raceSlug: bestWeekend.raceSlug }}
                    className="group flex items-center gap-3 border-y border-border py-3"
                  >
                    {bestWeekendCountry ? (
                      <RaceFlag countryCode={bestWeekendCountry} size="md" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-text group-hover:text-accent">
                        {bestWeekend.raceName}
                      </span>
                      <span className="block text-xs text-text-muted">
                        Round {bestWeekend.round}
                        {bestWeekend.rank !== null
                          ? ` · P${bestWeekend.rank} of ${bestWeekend.players} that weekend`
                          : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="gpp-mono block text-xl font-semibold text-accent">
                        {bestWeekend.points}
                      </span>
                      <span className="block text-xs text-text-muted">pts</span>
                    </span>
                  </Link>
                  {bestSession ? (
                    <p className="mt-2 text-xs text-text-muted">
                      Best session: {bestSession.raceName}{' '}
                      {SESSION_LABELS[bestSession.sessionType]},{' '}
                      {bestSession.points} pts
                    </p>
                  ) : null}
                </section>
              ) : null}

              {mostBacked ? (
                <section>
                  <SectionHeading>Most backed</SectionHeading>
                  <div
                    className="gpp-team-bar flex items-center gap-3 border-y border-border py-3 pl-3"
                    style={teamStyle(mostBacked.team)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-text">
                        {mostBacked.name}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {mostBacked.team ?? 'No team'}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="gpp-mono block text-xl font-semibold text-text">
                        {mostBacked.timesPicked}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {mostBacked.timesPicked === 1 ? 'pick' : 'picks'}
                      </span>
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    Finished in the top 5 on {mostBacked.timesInTopFive} of
                    those.
                  </p>
                </section>
              ) : null}
            </div>

            {topFive.totalPicks > 0 ? (
              <section className="mb-7">
                <SectionHeading>Picks</SectionHeading>
                <PickBands
                  exact={topFive.exactPicks}
                  near={topFive.nearPicks}
                  topFive={topFive.topFivePicks}
                  total={topFive.totalPicks}
                />
                <p className="mt-3 text-xs text-text-muted">
                  Called the winner in {topFive.winnerCalls} of{' '}
                  {topFive.sessionsScored}{' '}
                  {topFive.sessionsScored === 1 ? 'session' : 'sessions'}.
                </p>
              </section>
            ) : null}

            <section>
              <SectionHeading>Weekend by weekend</SectionHeading>
              <ol className="border-t border-border">
                {weekends.map((weekend) => {
                  const countryCode = getCountryCodeForRace({
                    slug: weekend.raceSlug,
                  });
                  return (
                    <li key={weekend.raceId} className="border-b border-border">
                      <Link
                        to="/races/$raceSlug"
                        params={{ raceSlug: weekend.raceSlug }}
                        className="group flex items-center gap-3 py-2.5"
                      >
                        <span className="gpp-mono w-6 shrink-0 text-xs text-text-muted">
                          R{weekend.round}
                        </span>
                        {countryCode ? (
                          <RaceFlag countryCode={countryCode} size="sm" />
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text group-hover:text-accent">
                            {weekend.raceName}
                          </span>
                          <span
                            className="mt-1 block h-1 rounded-xs bg-accent"
                            style={{
                              width: `${Math.max(2, (weekend.points / maxWeekendPoints) * 100)}%`,
                            }}
                            aria-hidden="true"
                          />
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="gpp-mono block text-sm font-semibold text-text">
                            {weekend.points}
                          </span>
                          {weekend.rank !== null ? (
                            <span className="block text-xs text-text-muted">
                              P{weekend.rank} of {weekend.players}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
