import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { Flag } from '@/components/Flag';
import { RaceWriteupActions } from '@/components/race-writeups/RaceWriteupActions';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupPhaseLabel } from '@/components/race-writeups/RaceWriteupPhaseLabel';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendWeatherForecast } from '@/components/weather/WeekendWeatherForecast';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import {
  lastReviewedAt,
  reviewedIsoDate,
  reviewedStamp,
} from '@/lib/lastReviewed';
import { routeQuery } from '@/lib/routeQuery';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
} from '@/lib/raceWriteupPhase';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';
import {
  breadcrumbSchema,
  pageMeta,
  raceOgImageUrl,
  siteConfig,
  sportsEventSchema,
} from '@/lib/site';

import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

/** The date the hand-written prose on this page was last checked. */
const PROSE_REVIEWED = getRaceWriteupReviewedAt('madrid-2026');

const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const PATH = '/f1-2026-madrid-grand-prix-predictions';
const RACE_SLUG = 'madrid-2026';
const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/spain';
const CORNER_SOURCE =
  'https://www.the-race.com/formula-1/madrid-f1-track-spanish-gp-standout-corner-la-monumental-our-verdict/';
const TEST_SOURCE =
  'https://www.grandprix.com/news/madring-praise-red-flags-first-formula-3-test-2026.html';

type Championship = FunctionReturnType<
  typeof api.f1Standings.getF1Championship
>;

const FAQS = [
  {
    question: 'When is the 2026 Spanish Grand Prix in Madrid?',
    answer:
      'The Spanish Grand Prix runs from 11 to 13 September 2026 at the Madring in Madrid. Qualifying is on Saturday and the 57-lap Grand Prix is on Sunday.',
  },
  {
    question: 'Is this the same race as the Barcelona Grand Prix?',
    answer:
      'No. 2026 has two races in Spain. Barcelona held its own round in June, and the Spanish Grand Prix title moved to Madrid for this one, which is why you will see both names used.',
  },
  {
    question: 'Has Formula 1 raced at the Madring before?',
    answer:
      'No. This is the circuit’s debut, and Madrid has not held a Grand Prix since Jarama in the 1980s. There is no previous race data for any driver or team here.',
  },
  {
    question: 'What makes the Madring hard to predict?',
    answer:
      'Nobody has a form guide. On top of that, La Monumental is a banked 547-metre corner that compresses the car hard enough to make ride height a real setup gamble, and teams are solving that for the first time on Friday.',
  },
  {
    question: 'Does the weather change how I should pick at the Madring?',
    answer:
      'More than at a circuit with history. Practice is the only reference anyone has here, so a wet Friday removes most of what the weekend was going to teach you and leaves the grid closer to a guess. The forecast for each day is on this page and updates as it changes.',
  },
  {
    question: 'Are other players’ picks visible before the session?',
    answer:
      'No. Picks stay private until the relevant session locks, so nobody can copy another player’s Top 5 before making their own call.',
  },
  {
    question: 'How are Spanish Grand Prix predictions scored?',
    answer:
      'An exact Top 5 position earns 5 points, one position away earns 3, and selecting a driver who finishes elsewhere in the actual Top 5 earns 1 point.',
  },
] as const;

export const Route = createFileRoute('/f1-2026-madrid-grand-prix-predictions')({
  component: MadridGrandPrixPredictionsPage,
  loader: async ({ context }) => {
    await setRaceDataCacheHeaders();
    const weatherNow = Date.now();
    const [race, championship, weather, news] = await Promise.all([
      context.queryClient.ensureQueryData(
        routeQuery(api.races.getRaceBySlug, { slug: RACE_SLUG }),
      ),
      // Live rather than a hard-coded snapshot, unlike the Monza page. This
      // weekend is a week after Monza, so any table written today is wrong by
      // the time anyone reads it: Monza is scored in between.
      context.queryClient.ensureQueryData(
        routeQuery(api.f1Standings.getF1Championship, {}),
      ),
      context.queryClient.ensureQueryData(
        routeQuery(api.weather.getByRaceSlug, {
          raceSlug: RACE_SLUG,
          now: weatherNow,
        }),
      ),
      context.queryClient.ensureQueryData(
        routeQuery(api.raceNews.list, { raceSlug: RACE_SLUG }),
      ),
    ]);
    if (!race) {
      throw notFound();
    }
    return { race, championship, weather, weatherNow, news };
  },
  head: ({ loaderData }) => {
    const race = loaderData?.race;
    const title = '2026 Spanish Grand Prix Predictions & Picks | Madrid';
    const description =
      race?.status === 'finished'
        ? 'Review the 2026 Spanish Grand Prix predictions and Madrid results, including what the first race at the Madring revealed.'
        : race?.status === 'cancelled'
          ? 'See the status of the cancelled 2026 Spanish Grand Prix and the Madring information prepared for the race weekend.'
          : 'Make your 2026 Spanish Grand Prix predictions for Madrid’s new Madring. See the schedule, what the new circuit demands, and how to read practice.';
    const circuit = getCircuitForRace(RACE_SLUG);
    const meta = pageMeta({
      title,
      description,
      path: PATH,
      image: raceOgImageUrl(RACE_SLUG),
      imageAlt:
        'Grand Prix Picks race card for the 2026 Spanish Grand Prix at the Madring in Madrid.',
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
                name: title,
                description,
                dateModified: reviewedIsoDate(PROSE_REVIEWED_AT),
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
                // A complete node or none at all. This was a three-property
                // stub, which Search Console counted as one invalid Event
                // (`Missing field "location"`) plus seven warnings. The
                // builder cannot produce that shape.
                ...(race && circuit
                  ? {
                      about: sportsEventSchema({
                        name: '2026 Spanish Grand Prix',
                        startAt: race.raceStartAt,
                        path: PATH,
                        description,
                        image: raceOgImageUrl(RACE_SLUG),
                        location: circuit,
                        cancelled: race.status === 'cancelled',
                      }),
                    }
                  : {}),
              },
              {
                '@type': 'FAQPage',
                '@id': `${siteConfig.url}${PATH}#faq`,
                mainEntity: FAQS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
              },
              breadcrumbSchema(PATH, [
                { name: 'Races', path: '/races' },
                { name: 'Spanish Grand Prix predictions', path: PATH },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function MadridGrandPrixPredictionsPage() {
  const { race, championship, weather, weatherNow, news } =
    Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="gpp-stripe grid gap-8 overflow-hidden rounded-sm bg-surface px-5 py-7 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <header>
            <div className="flex items-center gap-3">
              <Flag code="ES" size="xl" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted">
                  11–13 SEP · MADRING · ROUND {race.round}
                </p>
                <span className="text-text-disabled" aria-hidden>
                  ·
                </span>
                <RaceWriteupPhaseLabel phase={phase} />
              </div>
            </div>
            <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
              Spanish Grand Prix 2026 predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              {raceWriteupHeroSummary(
                phase,
                'The Spanish Grand Prix',
                'Madrid’s Madring is new, so every driver arrives with the same amount of race data: none. That makes practice worth more than usual and the grid harder to call than at any other round.',
              )}
            </p>
            <RaceWriteupActions
              phase={phase}
              raceSlug={RACE_SLUG}
              venueName="Madrid"
              circuitName="Madring"
              circuitSlug="madring"
            />
          </header>

          <RaceWriteupWeekendSchedule
            race={race}
            timeZone="Europe/Madrid"
            timeZoneLabel="MADRID TIME"
          />
        </div>

        {isLive ? (
          <WeekendWeatherForecast
            race={race}
            weather={weather}
            now={weatherNow}
          />
        ) : null}

        <NoFormGuide />
        <LaMonumental />
        <WatchTable />
        {isLive ? (
          <>
            <WeekendNewsSection items={news.items} />
            <ChampionshipContext championship={championship} />
          </>
        ) : null}

        <section className="py-8 sm:py-16" aria-labelledby="common-questions">
          <h2
            id="common-questions"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            Common questions
          </h2>
          <div className="mt-6 max-w-3xl divide-y divide-border border-y border-border">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="cursor-pointer list-none font-medium text-text marker:content-none">
                  {faq.question}
                </summary>
                <p className="gpp-reading-copy mt-3 text-text-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <RaceWriteupClosingPanel
          phase={phase}
          raceSlug={RACE_SLUG}
          venueName="Madrid"
        />

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Race facts and schedule:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
            Corner detail:{' '}
            <ExternalSource href={CORNER_SOURCE}>The Race</ExternalSource>.
            First running:{' '}
            <ExternalSource href={TEST_SOURCE}>Grandprix.com</ExternalSource>.
          </p>
          <p className="gpp-mono mt-2 text-xs">
            LAST REVIEWED {reviewedStamp(PROSE_REVIEWED_AT)}
          </p>
        </footer>
      </div>
    </div>
  );
}

/**
 * The thing that actually separates this weekend from every other one, and the
 * reason the page leads with it rather than with the layout.
 */
function NoFormGuide() {
  return (
    <section
      className="grid gap-7 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-labelledby="no-form-guide"
    >
      <div>
        <h2
          id="no-form-guide"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          There is no form guide for this one
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Every other round comes with history. Somebody won here last year,
          some car has always suited the place, and a driver has a lap record to
          defend. The Madring has none of that. It is the 81st circuit to hold a
          Grand Prix and Formula 1 has never turned a race lap on it, so the
          usual shortcut of leaning on last year’s result is simply unavailable.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          That cuts both ways for a prediction. Season form still means
          something, because a quick car is quick everywhere, but the margin
          that normally separates two closely matched drivers at a familiar
          track is guesswork here. Expect more of the field to be in play than
          usual, and treat a confident Top 5 built on Thursday with suspicion.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          The practical answer is to wait. Friday is worth more at the Madring
          than anywhere else on the calendar, because it is the first real
          information anyone has.
        </p>
      </div>
      <dl className="self-start rounded-sm bg-surface-elevated px-4">
        {[
          ['Circuit', 'Madring, Madrid'],
          ['Layout', '5.416 km, 22 corners'],
          ['Race', '57 laps'],
          ['F1 history', 'None. Debut in 2026'],
          ['Upset risk', 'Higher than usual'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-b border-border py-4 last:border-0"
          >
            <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The one corner with a genuine predictive consequence, which is why it gets a
 * section rather than a line in the layout table. The setup compromise it
 * forces is the closest thing this weekend has to a known variable.
 */
function LaMonumental() {
  return (
    <section
      className="grid gap-7 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-labelledby="la-monumental"
    >
      <div>
        <h2
          id="la-monumental"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          La Monumental is a setup problem
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Turn 12 is a 270 degree right-hander held for 547 metres on 24 percent
          banking, the longest corner in Formula 1. Cars are reported to take it
          at around 250 kph under roughly 4G of sustained compression for about
          two seconds, which is long enough to squash the car onto its floor.{' '}
          <ExternalSource href={CORNER_SOURCE}>
            Read the corner breakdown
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          That is where the prediction lives. Run the car low and it is fast
          everywhere but risks floor damage or a plank infringement through the
          banking. Run it high and the compression is safe but the rest of the
          lap is slower. Formula 3 cars were already touching the track there in
          testing, so the compromise is real, and every team is solving it for
          the first time on Friday.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Teams will not all get it right. That is worth more to a Top 5 than
          any lap time you see before Saturday: a car that looks quick in FP1
          and then raises its ride height for the race has given something up,
          and one that gets the compromise right can be quicker on Sunday than
          Friday suggested.
        </p>
      </div>
      <dl className="self-start rounded-sm bg-surface-elevated px-4">
        {[
          ['Corner', 'Turn 12, La Monumental'],
          ['Length', '547 m, 270 degrees'],
          ['Banking', '24 percent'],
          ['Load', 'About 4G for two seconds'],
          ['Decides', 'Ride height, and what it costs'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-b border-border py-4 last:border-0"
          >
            <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WatchTable() {
  const rows = [
    [
      'Friday, not Thursday',
      'The first laps anyone has ever run in a race car here',
      'This is the only new information all weekend. Nothing before it is worth much.',
    ],
    [
      'Ride height changes',
      'Cars sitting higher in FP3 than FP1',
      'A team that raised the car has chosen safety through the banking over lap time.',
    ],
    [
      'The tight sector',
      'Traction and braking around the exhibition halls',
      'The street-style section rewards a settled rear, and it is where a lap is lost.',
    ],
    [
      'Long-run pace',
      'Lap after lap at the same pace',
      'Race picks need tyre behaviour over a stint, which a new surface makes harder to guess.',
    ],
  ] as const;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="what-to-watch">
      <div className="max-w-3xl">
        <h2
          id="what-to-watch"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          What to watch in practice
        </h2>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          With no history to lean on, practice is the form guide. These are the
          four things worth reading before you separate two drivers.
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([title, what, why]) => (
          <div key={title} className="bg-surface p-5">
            <dt className="font-title text-sm font-medium text-text">
              {title}
            </dt>
            <dd className="mt-2 text-sm text-text-muted">{what}</dd>
            <dd className="gpp-reading-copy mt-2 text-sm text-text-muted">
              {why}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ChampionshipContext({ championship }: { championship: Championship }) {
  const drivers = championship?.drivers?.slice(0, 6) ?? [];
  const leader = drivers[0];
  const second = drivers[1];
  const gap = leader && second ? leader.points - second.points : null;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="championship-context">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <h2
            id="championship-context"
            className="font-title text-2xl font-medium text-text"
          >
            Championship form going in
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            {leader && second && gap !== null
              ? `${leader.displayName} leads the drivers’ table from ${second.displayName} by ${gap} ${gap === 1 ? 'point' : 'points'}.`
              : 'The drivers’ table is the best form check available before the weekend starts.'}{' '}
            At a circuit nobody has raced, season form is the strongest signal
            you have on Thursday. It is also the weakest it will be all year by
            Saturday, once practice has told everyone something.
          </p>
          <Link
            to="/f1-standings"
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            View full 2026 standings{' '}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="border border-border bg-surface">
          <div className="flex justify-between border-b border-border px-4 py-3">
            <h3 className="font-title font-medium text-text">Drivers</h3>
            <span className="gpp-mono text-xs text-text-muted">
              {championship?.roundsScored
                ? `AFTER ${championship.roundsScored} ROUNDS`
                : 'CURRENT'}
            </span>
          </div>
          {/* The label sits on the list, not the wrapper: an aria-label on a
              role-less div is ignored by assistive tech. */}
          <ol aria-label="Top six drivers">
            {drivers.map((driver, index) => (
              <li
                key={driver.displayName}
                className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 last:border-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="gpp-mono w-4 text-xs text-text-muted">
                    {index + 1}
                  </span>
                  {/* Same badge as the standings page and the Monza write-up:
                      the 3px team bar is what makes a row scannable rather
                      than a name to read. */}
                  <DriverBadge
                    code={driver.code}
                    team={driver.team}
                    displayName={driver.displayName}
                    number={driver.number}
                    nationality={driver.nationality}
                    size="sm"
                    prerenderTooltip={false}
                  />
                  <span className="truncate text-sm text-text">
                    {driver.displayName}
                  </span>
                </span>
                <span className="gpp-mono text-sm text-text">
                  {driver.points}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function ExternalSource({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-block font-semibold whitespace-nowrap text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
    >
      {children}
    </a>
  );
}
