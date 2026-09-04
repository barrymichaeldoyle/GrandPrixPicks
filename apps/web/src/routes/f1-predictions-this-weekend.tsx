import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { FunctionReturnType } from 'convex/server';
import { ArrowDown, ArrowRight } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { PageHeader } from '@/components/PageHeader';
import { RaceFlag } from '@/components/RaceFlag';
import {
  DeferredRaceWriteupPicks,
  RACE_WRITEUP_PICKS_ANCHOR,
} from '@/components/race-writeups/DeferredRaceWriteupPicks';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { abbreviateGrandPrix, displayTeamName } from '@/lib/display';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { getRaceWriteup } from '@/lib/raceWriteups';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupPrimaryAction,
} from '@/lib/raceWriteupPhase';
import { routeQuery } from '@/lib/routeQuery';
import {
  breadcrumbSchema,
  pageMeta,
  raceOgImageUrl,
  siteConfig,
  sportsEventSchema,
} from '@/lib/site';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

const PATH = '/f1-predictions-this-weekend';

/**
 * The evergreen entry point for "F1 predictions" as a search intent.
 *
 * Search Console says race pages rank top-10 (`/races/italy-2026` at 7.2,
 * `/races/madrid-2026` at 5.9) while the category head terms land on the
 * homepage and stall: `f1 picks` at 45.2, `formula 1 picks` at 59.0. Nothing on
 * the site was actually *about* making picks; the homepage is half landing page
 * and half dashboard, and the race pages are named after one Grand Prix each.
 *
 * So this is one stable URL that always describes the next round.
 *
 * It began as a hub that only handed off: it described the weekend and pointed
 * at `/races/$raceSlug` for the picks. That made it a corridor, and it was the
 * corridor the footer's primary button on every page opened onto, so the site's
 * loudest call to action led to a page that could not take a prediction. It now
 * finishes the job in place, the way the editorial write-ups do: the round's
 * Top 5 picker is on the page, and the header's button is a same-page anchor.
 *
 * It is still not a second race page. Results and duels stay on
 * `/races/$raceSlug`, which is linked from beside the picker.
 */

type NextRace = FunctionReturnType<typeof api.races.getQuickPickRace>;
type Driver = FunctionReturnType<typeof api.drivers.listDrivers>[number];

/**
 * How close a race has to be for "this weekend" to be true.
 *
 * The URL and title carry the phrase because that is what people search, but
 * the heading is read by a person, and a page announcing "this weekend" during
 * a three-week summer gap is simply wrong. Measured from the loader's clock so
 * the server and the client agree on which heading they rendered.
 */
const THIS_WEEKEND_MS = 7 * 24 * 60 * 60 * 1000;

const SCORING_BANDS = [
  {
    points: '5',
    unit: 'points',
    label: 'Exact position',
    detail: 'Your driver finishes exactly where you put them.',
    textClass: 'text-result-exact',
    ruleClass: 'bg-result-exact',
  },
  {
    points: '3',
    unit: 'points',
    label: 'One position away',
    detail: 'Your driver finishes one place above or below your pick.',
    textClass: 'text-result-near',
    ruleClass: 'bg-result-near',
  },
  {
    points: '1',
    unit: 'point',
    label: 'Elsewhere in the top 5',
    detail: 'Your driver still finishes in the top 5, two or more places out.',
    textClass: 'text-result-top5',
    ruleClass: 'bg-result-top5',
  },
] as const;

function isThisWeekend(race: NextRace, now: number): boolean {
  return race !== null && race.raceStartAt - now <= THIS_WEEKEND_MS;
}

function headingFor(race: NextRace, now: number): string {
  if (!race) {
    return 'F1 predictions';
  }
  return isThisWeekend(race, now)
    ? 'F1 predictions this weekend'
    : `F1 predictions: ${race.name}`;
}

function descriptionFor(race: NextRace): string {
  if (!race) {
    return 'No Grand Prix is scheduled. Browse the Formula 1 calendar and see how the season finished.';
  }
  return `Pick your top 5 for the ${race.name} before the first session locks. Free to play, 25 points a session, and a global leaderboard.`;
}

/** Drivers arrive in championship-team order, so grouping preserves it. */
function groupByTeam(drivers: readonly Driver[]) {
  const teams: { team: string; drivers: Driver[] }[] = [];
  for (const driver of drivers) {
    const team = driver.team ?? 'Unknown';
    const last = teams.at(-1);
    if (last?.team === team) {
      last.drivers.push(driver);
    } else {
      teams.push({ team, drivers: [driver] });
    }
  }
  return teams;
}

export const Route = createFileRoute('/f1-predictions-this-weekend')({
  component: PredictionsThisWeekendPage,
  loader: async ({ context }) => {
    await setRaceDataCacheHeaders();

    // `getQuickPickRace`, not `getNextRace`: once the first session locks on
    // Friday, the next *submittable* race is the round after this one, and a
    // page called "this weekend" would spend the whole weekend pointing at the
    // wrong Grand Prix.
    const now = Date.now();
    const race = await context.queryClient.ensureQueryData(
      routeQuery(api.races.getQuickPickRace, {}),
    );

    // The pick pool as it stands for this round, so a stand-in appears in place
    // of the driver they are replacing. `includeNotRacing` stays off: this page
    // resolves no saved picks, so a driver without a seat has no business here.
    const drivers = race
      ? await context.queryClient.ensureQueryData(
          routeQuery(api.drivers.listDrivers, {
            round: race.round,
            season: race.season,
          }),
        )
      : [];

    return { race, drivers, now };
  },
  head: ({ loaderData }) => {
    const race = loaderData?.race ?? null;
    const title = 'F1 Predictions This Weekend | Grand Prix Picks';
    const description = descriptionFor(race);
    const circuit = race ? getCircuitForRace(race.slug) : null;

    const meta = pageMeta({
      title,
      description,
      path: PATH,
      image: race ? raceOgImageUrl(race.slug) : undefined,
      imageAlt: race
        ? `Grand Prix Picks race card for the ${race.season} ${race.name}.`
        : undefined,
    });

    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                '@id': `${siteConfig.url}${PATH}#page`,
                url: `${siteConfig.url}${PATH}`,
                name: 'F1 predictions this weekend',
                description,
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
                ...(race && circuit
                  ? {
                      about: sportsEventSchema({
                        name: `${race.season} ${race.name}`,
                        startAt: race.raceStartAt,
                        path: PATH,
                        description,
                        image: raceOgImageUrl(race.slug),
                        location: circuit,
                        cancelled: race.status === 'cancelled',
                      }),
                    }
                  : {}),
              },
              breadcrumbSchema(PATH, [
                { name: 'Races', path: '/races' },
                { name: 'Predictions this weekend', path: PATH },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function teamColor(team: string): string {
  return TEAM_COLORS[team] || FALLBACK_TEAM_COLOR;
}

function PredictionsThisWeekendPage() {
  const {
    race: initialRace,
    drivers: initialDrivers,
    now,
  } = Route.useLoaderData();

  // Also the observer that keeps the loader's cache entries subscribed; without
  // it they sit unwatched behind an infinite stale time and the page never
  // notices a race locking.
  const { data: liveRace } = useQuery(
    routeQuery(api.races.getQuickPickRace, {}),
  );
  // Explicitly `undefined`, not `??`: this query returns `null` for "no race is
  // scheduled", and `??` would treat that answer as no answer and keep showing
  // the loader's race after the last round of the season had run.
  const race = liveRace !== undefined ? liveRace : initialRace;
  const { data: liveDrivers } = useQuery({
    ...routeQuery(api.drivers.listDrivers, {
      round: race?.round,
      season: race?.season,
    }),
    enabled: race !== null,
  });
  const drivers = liveDrivers ?? initialDrivers;

  const circuit = race ? getCircuitForRace(race.slug) : null;
  const countryCode = race ? getCountryCodeForRace(race) : null;
  const writeup = getRaceWriteup(race?.slug);
  const teams = groupByTeam(drivers);

  // The loader's clock, like `headingFor` above, so the server and the client
  // agree on whether this round is still open. `getQuickPickRace` can return a
  // race that has already locked, and offering a picker for it would be a
  // promise the mutation refuses to keep.
  const phase = race ? getRaceWriteupPhase(race, now) : null;
  const picksOpen = phase !== null && isRaceWriteupLive(phase);
  // "Italian GP", not "Monza": the venue reads better but a hub covers every
  // round, including the ones whose circuit locality is not what anyone calls
  // the weekend (Sepang's is Kuala Lumpur).
  const venueName = race ? abbreviateGrandPrix(race.name) : '';
  const actionClass =
    'inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-base font-semibold text-text-on-accent transition-colors hover:bg-accent-hover';

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          title={headingFor(race, now)}
          subtitle={
            race ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
                {countryCode ? (
                  <RaceFlag countryCode={countryCode} size="sm" />
                ) : null}
                <span className="text-text">
                  Round {race.round}, {race.season}
                </span>
                {circuit ? (
                  <>
                    <span aria-hidden className="text-text-muted">
                      ·
                    </span>
                    <span className="text-text-muted">
                      {circuit.name}, {circuit.locality}
                    </span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-base">No Grand Prix is scheduled right now.</p>
            )
          }
          actions={
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {race && phase ? (
                picksOpen ? (
                  <a
                    href={`#${RACE_WRITEUP_PICKS_ANCHOR}`}
                    className={actionClass}
                  >
                    {raceWriteupPrimaryAction(phase, venueName, true)}
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </a>
                ) : (
                  <Link
                    to="/races/$raceSlug"
                    params={{ raceSlug: race.slug }}
                    className={actionClass}
                  >
                    {raceWriteupPrimaryAction(phase, venueName, true)}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )
              ) : (
                <Link to="/races" className={actionClass}>
                  Browse the race calendar
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              {/* The weekend's write-up, where one exists. It sat at the foot
                  of the page in a list of related links, which made the read
                  look like a step on the way to the picks rather than the
                  optional extra it is. */}
              {writeup ? (
                <Link
                  to={writeup.to}
                  className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
                >
                  {writeup.cta}
                </Link>
              ) : null}
            </div>
          }
        />

        {race && phase && picksOpen ? (
          <DeferredRaceWriteupPicks
            phase={phase}
            raceId={race._id}
            round={race.round}
            season={race.season}
            raceSlug={race.slug}
            surface="predictions_hub"
            venueName={venueName}
          />
        ) : null}

        {race && circuit ? (
          <div className="mt-8">
            <RaceWriteupWeekendSchedule
              race={race}
              timeZone={circuit.timeZone}
              timeZoneLabel="Track time"
            />
          </div>
        ) : null}

        {/* Kept alongside the picker rather than folded into it. The picker is
            a flat pool that hydrates on the client; this is the line-up by
            team, and it is the only driver content a crawler sees on the page.
            It was headed "Who you can pick" over a line telling the reader to
            choose five, which is the picker's job now, so both said the same
            thing twice. */}
        {teams.length > 0 ? (
          <section className="mt-10" aria-labelledby="round-line-up">
            <h2
              id="round-line-up"
              className="font-title text-xl font-semibold text-text"
            >
              Line-up for this round
            </h2>
            <div className="mt-5 grid gap-x-10 gap-y-3 border-y border-border py-3 sm:grid-cols-2">
              {teams.map(({ team, drivers: lineup }) => (
                <div key={team} className="py-3">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-3 w-1 rounded-full"
                      style={{ backgroundColor: teamColor(team) }}
                    />
                    <h3 className="text-base font-semibold text-text">
                      {displayTeamName(team)}
                    </h3>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {lineup.map((driver) => (
                      <li key={driver.code}>
                        <DriverBadge
                          code={driver.code}
                          team={team}
                          displayName={driver.displayName}
                          number={driver.number}
                          nationality={driver.nationality}
                          prerenderTooltip={false}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10" aria-labelledby="how-picks-score">
          <h2
            id="how-picks-score"
            className="font-title text-xl font-semibold text-text"
          >
            How picks score
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            {SCORING_BANDS.map((band) => (
              <div key={band.label}>
                <span
                  aria-hidden
                  className={`block h-0.5 w-8 ${band.ruleClass}`}
                />
                <dt className="mt-3 text-base font-semibold text-text">
                  <span className={`gpp-mono ${band.textClass}`}>
                    {band.points}
                  </span>{' '}
                  {band.unit} · {band.label}
                </dt>
                <dd className="mt-1 text-base leading-6 text-text-muted">
                  {band.detail}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 max-w-3xl text-lg leading-7 text-text-muted">
            Every session scores out of 25, and each one locks at its own start
            time, so qualifying can be settled while the race is still open.{' '}
            <Link
              to="/how-to-play"
              className="font-medium text-accent hover:underline"
            >
              See the full rules
            </Link>
            .
          </p>
        </section>

        <section className="mt-10" aria-labelledby="more-picks">
          <h2
            id="more-picks"
            className="font-title text-xl font-semibold text-text"
          >
            Team-mate picks
          </h2>
          <p className="mt-2 max-w-3xl text-lg leading-7 text-text-muted">
            Alongside the top 5 you pick who finishes ahead in each team, one
            point per correct call.{' '}
            <Link
              to="/f1-team-mate-battles"
              className="font-medium text-accent hover:underline"
            >
              See this season&rsquo;s team-mate records
            </Link>
            .
          </p>
        </section>

        <nav className="mt-10 border-t border-border pt-6" aria-label="Related">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base">
            <li>
              <Link
                to="/races"
                className="font-medium text-accent hover:underline"
              >
                Full {race?.season ?? ''} race calendar
              </Link>
            </li>
            <li>
              <Link
                to="/leaderboard"
                className="font-medium text-accent hover:underline"
              >
                Global leaderboard
              </Link>
            </li>
            <li>
              <Link
                to="/f1-standings"
                className="font-medium text-accent hover:underline"
              >
                F1 championship standings
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
