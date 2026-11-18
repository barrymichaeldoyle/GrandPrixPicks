import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { Flag } from '@/components/Flag';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { CALENDAR_2027 } from '@/lib/calendar2027';
import { podiumClasses } from '@/lib/podium';
import { getCountryCodeForRaceSlug } from '@grandprixpicks/shared/raceCountries';

const DAY_MS = 24 * 60 * 60 * 1000;

/** As `home.getHomePageData` returns it between seasons. */
export type SeasonPodium = {
  season: number;
  players: readonly {
    rank: number;
    userId: string;
    username: string;
    points: number;
  }[];
};

/**
 * The first round of the 2027 calendar still to race, with whole days to its
 * race day. Null once the calendar has run out, which by then means the 2027
 * rounds are seeded and the race hero has taken over.
 */
export function nextOpener(now: number) {
  const round = CALENDAR_2027.find(
    (candidate) => Date.parse(`${candidate.raceDate}T00:00:00Z`) > now,
  );
  if (!round) {
    return null;
  }
  const days = Math.ceil(
    (Date.parse(`${round.raceDate}T00:00:00Z`) - now) / DAY_MS,
  );
  return { round, days };
}

/** "Sun 14 Mar", from an ISO race date. */
function formatRaceDay(raceDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(Date.parse(`${raceDate}T00:00:00Z`))
    .replace(',', '');
}

/**
 * The landing hero between seasons (`docs/design-display-register.md`).
 *
 * With no race to lead with, the race hero used to fall back to a bare
 * "Predict the F1 Top 5" and a calendar button for three months: the plainest
 * the page ever looked, through the quietest stretch of the year. This keeps
 * the same shape and register, and fills it with the two things that are true
 * in December: how the season just ended, and when the next one starts.
 */
export function OffSeasonHero({
  podium,
  now,
}: {
  podium: SeasonPodium | null;
  now: number;
}) {
  const opener = nextOpener(now);
  const nextSeason = opener
    ? Number(opener.round.raceDate.slice(0, 4))
    : (podium?.season ?? new Date(now).getUTCFullYear()) + 1;
  const flagCode = opener ? getCountryCodeForRaceSlug(opener.round.slug) : null;
  const players = podium?.players ?? [];

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      aria-labelledby="landing-hero-title"
    >
      <div className="mx-auto grid w-full max-w-(--page-max) gap-y-10 px-4 pt-6 pb-10 sm:pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-x-12 lg:pb-12">
        <div className="min-w-0">
          {opener ? (
            <div className="flex items-center gap-3">
              {flagCode ? (
                <Flag
                  code={flagCode}
                  size="md"
                  shear
                  className="gpp-hero-flag"
                />
              ) : null}
              <p className="gpp-mono text-xs text-text-muted">
                <span className="text-text">
                  {nextSeason} · Round {opener.round.round}
                </span>
                {' · '}
                {opener.round.dates}
                <span className="hidden sm:inline">
                  {' · '}
                  {opener.round.venue}
                </span>
              </p>
            </div>
          ) : null}

          <h1 id="landing-hero-title" className="mt-4 text-text">
            <span className="block text-lg leading-tight font-normal text-text-muted sm:text-2xl">
              Predict the F1 Top 5 in
            </span>{' '}
            {/* A four-figure year is a third the width of a race name, so it
                takes a larger size than `.gpp-display` to hold the page. */}
            <span className="gpp-display gpp-display-year mt-2 block sm:mt-3">
              {nextSeason}
            </span>
          </h1>

          {opener ? (
            <div className="mt-6 flex flex-wrap items-end gap-x-7 gap-y-2">
              <p className="text-sm text-text-muted sm:pb-1.5 sm:text-base">
                <span className="block font-semibold text-text">
                  {opener.round.name} Grand Prix in
                </span>
                <span className="gpp-mono">
                  Race day {formatRaceDay(opener.round.raceDate)}
                </span>
              </p>
              <p className="flex flex-col">
                <span className="gpp-hero-digits">{opener.days}</span>
                <span className="mt-1 text-xs text-text-muted">
                  {opener.days === 1 ? 'day' : 'days'}
                </span>
              </p>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="md" rightIcon={ArrowRight}>
              <Link
                to="/f1-2027-calendar"
                onClick={() =>
                  captureAnalyticsEvent('landing_hero_cta_clicked', {
                    placement: 'off_season_calendar',
                  })
                }
              >
                See the {nextSeason} calendar
              </Link>
            </Button>
            <Button asChild size="md" variant="secondary">
              <Link to="/how-to-play">How to play</Link>
            </Button>
          </div>
        </div>

        {players.length > 0 && podium ? (
          <section aria-labelledby="landing-hero-podium" className="min-w-0">
            <div className="mb-2.5 flex items-baseline justify-between gap-4">
              <h2
                id="landing-hero-podium"
                className="gpp-mono text-xs font-medium text-text-muted"
              >
                {podium.season} final standings
              </h2>
              <Link
                to="/leaderboard"
                search={{ time: 'season' }}
                className="gpp-mono text-xs text-text underline decoration-border-strong underline-offset-4 hover:decoration-text"
              >
                Full standings
              </Link>
            </div>
            {/* The podium in its own colours, the fills the season board
                gives ranks 1 to 3. Points are Top 5 plus team-mate picks, as
                that board ranks them. */}
            <ol className="grid gap-1">
              {players.map((player, index) => (
                <li
                  key={player.userId}
                  className="gpp-hero-band"
                  style={{ animationDelay: `${120 + index * 60}ms` }}
                >
                  <Link
                    to="/p/$username"
                    params={{ username: player.username }}
                    search={{ from: undefined, fromLabel: undefined }}
                    className={`gpp-hero-band-link grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-3 border px-4 ${
                      index === 0 ? 'py-5' : 'py-3'
                    } ${podiumClasses(player.rank) ?? 'border-border bg-surface-elevated text-text'}`}
                  >
                    <span
                      className={`gpp-mono leading-none font-semibold ${
                        index === 0 ? 'text-4xl' : 'text-2xl'
                      }`}
                    >
                      <span className="sr-only">Rank </span>
                      {player.rank}
                    </span>
                    <span
                      className={`truncate font-semibold ${
                        index === 0 ? 'text-xl' : 'text-base'
                      }`}
                    >
                      {player.username}
                    </span>
                    <span className="gpp-mono text-sm font-semibold">
                      {player.points}
                      <span className="sr-only"> points</span>
                      <span aria-hidden> pts</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </section>
  );
}
