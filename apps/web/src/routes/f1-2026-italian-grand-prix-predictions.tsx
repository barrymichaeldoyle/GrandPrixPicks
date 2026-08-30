import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight, Plus } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';
import { Flag } from '@/components/Flag';
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
  breadcrumbSchema,
  pageMeta,
  raceOgImageUrl,
  siteConfig,
  sportsEventSchema,
} from '@/lib/site';

import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

/**
 * The date the hand-written prose on this page was last checked. It is the
 * floor for the reviewed stamp, not the whole answer: the live forecast,
 * news and standings carry it forward on their own. Bump it when the writing
 * changes, not when the data does.
 */
const PROSE_REVIEWED = '2026-08-30';

/**
 * One value for the footer stamp and the schema's `dateModified`. They were
 * two hand-typed literals before, which is how they came to disagree.
 */
function reviewedFrom(data: {
  weather?: { forecast: { checkedAt: number } } | null;
  news?: { items: { publishedAt: number }[] } | null;
}): number {
  return lastReviewedAt(
    PROSE_REVIEWED,
    data.weather?.forecast.checkedAt,
    ...(data.news?.items ?? []).map((item) => item.publishedAt),
  );
}

const PATH = '/f1-2026-italian-grand-prix-predictions';
const RACE_SLUG = 'italy-2026';
const HADJAR_SOURCE =
  'https://www.skysports.com/f1/news/12433/13575278/isack-hadjar-red-bull-driver-hopeful-of-monza-return-after-wrist-injury-forces-him-out-of-dutch-grand-prix';
const LIVERY_SOURCE =
  'https://www.motorsport.com/f1/news/f1-ferrari-surprise-sf-26-to-run-special-michael-schumacher-livery-at-monza/10849464/';
const NORRIS_CONTRACT_SOURCE =
  'https://www.formula1.com/en/latest/article/lando-norris-commits-future-to-mclaren-as-he-signs-new-deal-until-the-end-of-2030.7ErHTktjoW2mAo5zEEtuA0';
const MCLAREN_FORM_SOURCE =
  'https://www.motorsport.com/f1/news/why-mclaren-must-pass-its-monza-test-before-talking-about-an-f1-title-challenge/10849795/';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compounds-selected-for-zandvoort-monza-and-madrid/';
const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/italy';
const F1_STANDINGS_SOURCE = 'https://www.formula1.com/en/results/2026/drivers';

type Race = NonNullable<FunctionReturnType<typeof api.races.getRaceBySlug>>;
/*
 * Durable questions only.
 *
 * Two entries were removed for restating something already on the page: one
 * put the forecast component's own opening paragraph into question form, and
 * one repeated the Antonelli news item almost word for word.
 *
 * The line to hold is that anything which is *news* belongs in `raceNews`,
 * where it retires with the weekend. An FAQ is hard-coded, so a question about
 * this weekend's events is stale the moment the weekend ends, while the same
 * fact published as news simply stops being shown. What stays here are
 * questions whose answers outlive the race: when it runs, how scoring works,
 * and what a grid penalty does to a classification.
 */
const FAQS = [
  {
    question: 'When is the 2026 Italian Grand Prix?',
    answer:
      'The Italian Grand Prix runs from 4 to 6 September 2026 at Monza. Qualifying is on Saturday and the 53-lap Grand Prix is on Sunday.',
  },
  {
    question:
      'If a driver qualifies P4 and a grid penalty drops him to P14, what does my qualifying pick score?',
    answer:
      'The P4. Qualifying picks use the official qualifying classification. The grid penalty is applied afterwards, so a driver classified P4 counts as P4 for your qualifying picks even when they start P14 on Sunday.',
  },
  {
    question: 'Will Isack Hadjar race at Monza?',
    answer:
      'Hadjar said he was hopeful of returning after missing Zandvoort with a wrist injury. His Monza seat was not confirmed when this guide was reviewed, so check the final entry and team updates before locking a pick.',
  },
  {
    question: 'What matters most when predicting Monza?',
    answer:
      'Watch straight-line speed alongside braking stability, traction out of the chicanes and representative long-run pace. A lap helped by a strong tow can flatter a car at Monza.',
  },
  {
    question: 'Are other players’ picks visible before the session?',
    answer:
      'No. Picks stay private until the relevant session locks, so nobody can copy another player’s Top 5 before making their own call.',
  },
  {
    question: 'How are Italian Grand Prix predictions scored?',
    answer:
      'An exact Top 5 position earns 5 points, one position away earns 3, and selecting a driver who finishes elsewhere in the actual Top 5 earns 1 point.',
  },
] as const;

export const Route = createFileRoute('/f1-2026-italian-grand-prix-predictions')(
  {
    component: ItalianGrandPrixPredictionsPage,
    loader: async ({ context }) => {
      await setRaceDataCacheHeaders();
      const weatherNow = Date.now();
      const [race, weather, news, championship] = await Promise.all([
        context.queryClient.ensureQueryData(
          routeQuery(api.races.getRaceBySlug, { slug: RACE_SLUG }),
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
        // Live, like the Madrid page. The hardcoded table this replaces was
        // right when it was typed and wrong the moment a race was scored, and
        // it carried names only, so the standings block was the one place on
        // the site showing drivers without their team colour.
        context.queryClient.ensureQueryData(
          routeQuery(api.f1Standings.getF1Championship, {}),
        ),
      ]);
      if (!race) {
        throw notFound();
      }
      return { race, weather, weatherNow, news, championship };
    },
    head: ({ loaderData }) => {
      const race = loaderData?.race;
      const title = '2026 Italian Grand Prix Predictions & Picks';
      const description =
        'Make your 2026 Italian Grand Prix predictions. Monza schedule and weather, plus what Antonelli’s grid penalty changes for qualifying against race picks.';
      const circuit = getCircuitForRace(RACE_SLUG);
      const reviewedAt = reviewedFrom(loaderData ?? {});
      const meta = pageMeta({
        title,
        description,
        path: PATH,
        image: raceOgImageUrl(RACE_SLUG),
        imageAlt:
          'Grand Prix Picks race card for the 2026 Italian Grand Prix at Monza.',
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
                  dateModified: reviewedIsoDate(reviewedAt),
                  inLanguage: 'en',
                  isPartOf: { '@id': `${siteConfig.url}/#app` },
                  // A complete node or none at all. This was a three-property
                  // stub, which Search Console counted as one invalid Event
                  // (`Missing field "location"`) plus seven warnings. The
                  // builder cannot produce that shape.
                  ...(race && circuit
                    ? {
                        about: sportsEventSchema({
                          name: '2026 Italian Grand Prix',
                          startAt: race.raceStartAt,
                          path: PATH,
                          description,
                          image: raceOgImageUrl(RACE_SLUG),
                          location: circuit,
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
                  { name: 'Italian Grand Prix predictions', path: PATH },
                ]),
              ],
            }),
          },
        ],
      };
    },
  },
);

function formatMonzaTime(timestamp: number | undefined) {
  if (timestamp === undefined) {
    return 'To be confirmed';
  }
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Rome',
    timeZoneName: 'short',
  }).format(timestamp);
}

function ItalianGrandPrixPredictionsPage() {
  const { race, weather, weatherNow, news, championship } =
    Route.useLoaderData();
  // One roster lookup for the sections that name drivers, so a badge and the
  // standings beside it can never disagree about a seat.
  const driversByCode = new Map(
    championship.drivers.map((driver) => [driver.code, driver]),
  );
  const reviewedAt = reviewedFrom({ weather, news });
  const isFinished = race.status === 'finished';

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="gpp-stripe grid gap-8 overflow-hidden rounded-sm bg-surface px-5 py-7 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <header>
            <div className="flex items-center gap-3">
              <Flag code="IT" size="xl" />
              <p className="gpp-mono text-sm text-text-muted">
                04–06 SEP · MONZA · ROUND {race.round}
              </p>
            </div>
            <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
              Italian Grand Prix 2026 predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              Check top speed, braking stability and traction out of the
              chicanes before choosing your qualifying and race Top 5.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/races/$raceSlug"
                params={{ raceSlug: RACE_SLUG }}
                className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {isFinished ? 'See Monza results' : 'Make your Monza picks'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/circuits/$circuitSlug"
                params={{ circuitSlug: 'monza' }}
                className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
              >
                Read the Monza circuit guide
              </Link>
            </div>
          </header>

          <WeekendSchedule race={race} />
        </div>

        <WeekendWeatherForecast
          race={race}
          weather={weather}
          now={weatherNow}
        />

        <WeekendNewsSection items={news.items} />
        <WatchTable />
        <TyreChoice />
        {/* Hadjar and the standings both carry a right-hand card; the tribute
            and the contract do not. Run the two carded sections together so the
            rail does not appear, vanish and reappear, and let the prose-only
            asides follow. */}
        <HadjarStatus byCode={driversByCode} />
        <ChampionshipContext championship={championship} />
        <McLarenForm />
        <FerrariTribute />
        <NorrisContract />
        <PredictionMethod />

        <section className="py-8 sm:py-16" aria-labelledby="common-questions">
          <h2
            id="common-questions"
            className="font-title text-2xl font-medium text-text"
          >
            Italian Grand Prix prediction questions
          </h2>
          <div className="mt-7 grid gap-2">
            {FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-sm px-3 open:bg-surface hover:bg-surface sm:px-5"
              >
                <summary className="font-title flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-text marker:content-none">
                  {faq.question}
                  <Plus
                    className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-45"
                    aria-hidden
                  />
                </summary>
                <p className="gpp-reading-copy max-w-3xl pb-5 text-text-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-sm bg-surface px-5 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-7">
          <div>
            <h2 className="font-title text-xl font-medium text-text">
              Make your Monza picks
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
              Choose five drivers for qualifying and five for the race. You can
              change them until each session locks.
            </p>
          </div>
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: RACE_SLUG }}
            className="mt-5 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:mt-0"
          >
            {isFinished ? 'See Monza results' : 'Make your picks'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Race facts and schedule:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
            Driver availability:{' '}
            <ExternalSource href={HADJAR_SOURCE}>Sky Sports</ExternalSource>.
          </p>
          <p className="gpp-mono mt-2 text-xs">
            LAST REVIEWED {reviewedStamp(reviewedAt)}
          </p>
        </footer>
      </div>
    </div>
  );
}

function WeekendSchedule({ race }: { race: Race }) {
  const sessions = [
    ['Practice 1', race.fp1StartAt],
    ['Practice 2', race.fp2StartAt],
    ['Practice 3', race.fp3StartAt],
    ['Qualifying', race.qualiStartAt],
    ['Grand Prix', race.raceStartAt],
  ] as const;

  return (
    <section
      aria-labelledby="weekend-timing"
      className="rounded-sm bg-surface-elevated"
    >
      {/* One row from the start, like the rows it heads. Both halves are short
          enough to share a line at 320px. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 sm:py-3">
        <h2 id="weekend-timing" className="font-title font-medium text-text">
          Weekend schedule
        </h2>
        <span className="gpp-mono text-xs text-text-muted">MONZA TIME</span>
      </div>
      <dl>
        {sessions.map(([label, timestamp]) => (
          <div
            key={label}
            /* Two columns on a phone as well, not just from `sm`. Stacked,
               each session spent two lines and the whole schedule ran to
               315px, for a label and a time that sit side by side with room
               to spare. */
            className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 border-b border-border/60 px-4 py-2 last:border-b-0 sm:grid-cols-[6.5rem_1fr] sm:py-2.5"
          >
            <dt className="text-sm text-text-muted">{label}</dt>
            <dd className="gpp-mono text-right text-sm text-text">
              {formatMonzaTime(timestamp)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WatchTable() {
  const rows = [
    [
      'Straight-line pace',
      'Speed without relying on a tow',
      'A clean speed trace is more useful than the headline trap number.',
    ],
    [
      'Heavy braking',
      'A settled car into Rettifilo and Roggia',
      'Lock-ups or poor rotation make overtaking and tyre life harder.',
    ],
    [
      'Corner exits',
      'Traction out of both chicanes',
      'A weak exit gives away speed for the length of the next straight.',
    ],
    [
      'Long runs',
      'Consistent pace over several laps',
      'Race picks live on tyre behaviour and repeatable pace, and a tow-assisted lap shows neither.',
    ],
  ] as const;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="what-to-watch">
      <div className="max-w-3xl">
        <h2
          id="what-to-watch"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          What matters at Monza
        </h2>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          A speed-trap result can be inflated by a tow. Compare clean laps,
          braking performance and long-run pace before moving a driver into your
          Top 5.
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-4">
        {[
          ['5.793', 'km circuit'],
          ['53', 'race laps'],
          ['80%', 'full throttle'],
          ['1.1', 'km main straight'],
        ].map(([value, label]) => (
          /* The label is the term and the number is its value, so dt names
             the stat and dd carries the figure. The column is reversed in CSS
             because the design still wants the number read first. */
          <div
            key={label}
            className="flex flex-col-reverse bg-surface p-4 sm:p-5"
          >
            <dt className="mt-1 text-xs tracking-label text-text-muted uppercase">
              {label}
            </dt>
            <dd className="gpp-mono text-2xl text-text">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        {/* Column widths and padding match the rows below exactly — the
            header was 11rem/px-4 over 10rem/px-5 rows, so LOOK FOR and WHY IT
            MATTERS sat a half-step off the columns they were naming. */}
        <div
          className="hidden grid-cols-[10rem_1fr_1fr] gap-8 px-4 pb-3 text-xs font-semibold tracking-label text-text-muted uppercase sm:grid sm:px-5"
          aria-hidden
        >
          <span>Signal</span>
          <span>Look for</span>
          <span>Why it matters</span>
        </div>
        <div className="rounded-sm bg-surface px-4 sm:px-5">
          {rows.map(([check, signal, reason]) => (
            <div
              key={check}
              className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[10rem_1fr_1fr] sm:gap-8"
            >
              <h3 className="font-title text-sm font-medium text-text">
                {check}
              </h3>
              <p className="text-sm leading-6 text-text">{signal}</p>
              <p className="text-sm leading-6 text-text-muted">{reason}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HadjarStatus({ byCode }: { byCode: Map<string, StandingsDriver> }) {
  return (
    <section
      className="grid gap-7 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-labelledby="hadjar-status"
    >
      {/* Same team bar the tribute and the contract carry, and for the same
          reason: this is a story about one team's seat, and the colour says
          whose before the first line is read. Red Bull's, not Racing Bulls' —
          the seat in question is the one Lawson is filling. */}
      <div
        className="gpp-team-bar pl-4"
        style={
          {
            '--team-colour':
              TEAM_COLORS['Red Bull Racing'] ?? FALLBACK_TEAM_COLOR,
          } as CSSProperties
        }
      >
        <h2
          id="hadjar-status"
          className="font-title text-2xl font-medium text-text"
        >
          Hadjar is hopeful of returning at Monza
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Isack Hadjar missed the Dutch Grand Prix after hurting his wrist while
          boxing during the summer break. Sky Sports reported a small crack in a
          wrist bone. Liam Lawson filled his Red Bull seat, while Yuki Tsunoda
          moved into Lawson’s Racing Bulls car alongside Arvid Lindblad.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Hadjar said he hoped the extra recovery time would allow him to race
          at Monza. Red Bull has yet to confirm his return. Wait for the team or
          the official entry before relying on him in a pick.{' '}
          <ExternalSource href={HADJAR_SOURCE}>Read the report</ExternalSource>.
        </p>
      </div>
      <dl className="self-start rounded-sm bg-surface-elevated px-4">
        {/* This card is about who is in which seat, which is the one thing
            team colour exists to show. Names alone left a reader working out
            that two of these are Red Bull and one is Racing Bulls. */}
        {[
          {
            label: 'Monza status',
            code: 'HAD',
            note: 'Hopeful, unconfirmed',
          },
          { label: 'Red Bull cover at Zandvoort', code: 'LAW', note: null },
          { label: 'Racing Bulls cover', code: 'TSU', note: null },
        ].map(({ label, code, note }) => {
          const driver = byCode.get(code);
          return (
            <div
              key={label}
              className="border-b border-border py-4 last:border-0"
            >
              <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
                {label}
              </dt>
              <dd className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text">
                {driver ? (
                  <>
                    <DriverBadge
                      code={driver.code}
                      team={driver.team}
                      displayName={driver.displayName}
                      number={driver.number}
                      nationality={driver.nationality}
                      size="sm"
                      prerenderTooltip={false}
                    />
                    <span>{driver.displayName}</span>
                  </>
                ) : null}
                {note ? (
                  <span className={driver ? 'text-text-muted' : undefined}>
                    {note}
                  </span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

type Championship = FunctionReturnType<
  typeof api.f1Standings.getF1Championship
>;
type StandingsDriver = Championship['drivers'][number];

function ChampionshipContext({ championship }: { championship: Championship }) {
  const top = championship.drivers.slice(0, 6);
  const [leader, second] = top;
  if (!leader || !second) {
    return null;
  }

  return (
    <section className="py-8 sm:py-16" aria-labelledby="championship-context">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <h2
            id="championship-context"
            className="font-title text-2xl font-medium text-text"
          >
            Championship standings before Monza
          </h2>
          {/* The numbers are read from the same data as the table beside it.
              They used to be written into the prose, which was accurate until
              the next race was scored and then quietly disagreed with the
              standings sitting next to it. */}
          <p className="gpp-reading-copy mt-4 text-text-muted">
            After {championship.roundsScored} rounds, {leader.displayName} leads
            the drivers&rsquo; table by {leader.points - second.points} points
            from {second.displayName}. Use that as a form check, then compare it
            with the low-downforce pace shown in practice. Antonelli&rsquo;s
            penalty makes his Sunday starting position part of that form check.
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
              AFTER {championship.roundsScored} ROUNDS
            </span>
          </div>
          {/* The label sits on the list, not the wrapper: an aria-label on a
              role-less div is ignored by assistive tech. */}
          <ol aria-label="Top six drivers">
            {top.map((driver) => (
              <li
                key={driver.driverId}
                className="grid grid-cols-[1.25rem_auto_1fr_auto] items-center gap-2 border-b border-border/60 px-4 py-2.5 last:border-b-0"
              >
                <span className="gpp-mono text-sm text-text-muted">
                  {driver.position}
                </span>
                {/* The badge carries the team colour in its 3px bar, which is
                    what makes a name scannable as a Mercedes or a Ferrari
                    rather than a string to read. `prerenderTooltip` off: six
                    rows should not preload six flags nobody hovers. */}
                <DriverBadge
                  code={driver.code}
                  team={driver.team}
                  displayName={driver.displayName}
                  number={driver.number}
                  nationality={driver.nationality}
                  size="sm"
                  prerenderTooltip={false}
                />
                <span className="min-w-0 truncate text-sm text-text">
                  {driver.displayName}
                </span>
                <span className="gpp-mono text-sm text-text">
                  {driver.points} PTS
                </span>
              </li>
            ))}
          </ol>
          <p className="border-t border-border px-4 py-3 text-xs leading-5 text-text-muted">
            Scored through round {championship.roundsScored}
            {championship.lastUpdated
              ? `, updated ${reviewedStamp(championship.lastUpdated)}`
              : ''}
            . <ExternalSource href={F1_STANDINGS_SOURCE}>Source</ExternalSource>
          </p>
        </div>
      </div>
    </section>
  );
}

function PredictionMethod() {
  const steps = [
    [
      'Compare like-for-like practice laps',
      'Check whether the drivers ran similar fuel, tyres and track conditions. At Monza, note who had a tow.',
    ],
    [
      'Check how each qualifying lap was set',
      'Traffic and slipstreams can exaggerate small differences between cars.',
    ],
    [
      'Account for Turn 1',
      'Rettifilo compresses the field into one heavy stop. A pick near the back of your Top 5 carries extra opening-lap risk.',
    ],
    [
      'Resolve close calls after FP3',
      'Use final practice, weather and confirmed driver availability before separating closely matched drivers.',
    ],
  ] as const;

  return (
    <div className="grid gap-10 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section aria-labelledby="build-top-five">
        <h2
          id="build-top-five"
          className="font-title text-2xl font-medium text-text"
        >
          Before you lock your Top 5
        </h2>
        <ul className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {steps.map(([title, detail]) => (
            <li key={title}>
              <h3 className="font-title font-medium text-text">{title}</h3>
              <p className="gpp-reading-copy mt-1 text-text-muted">{detail}</p>
            </li>
          ))}
        </ul>
      </section>
      <aside className="self-start lg:pt-1">
        <h2 className="font-title text-lg font-medium text-text">
          Your picks stay private
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Selections are hidden from other players until the relevant session
          locks.
        </p>
        <Link
          to="/how-to-play"
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover"
        >
          See how scoring works <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </aside>
    </div>
  );
}

function McLarenForm() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="mclaren-form">
      <div
        className="gpp-team-bar max-w-3xl pl-4"
        style={
          {
            '--team-colour': TEAM_COLORS.McLaren ?? FALLBACK_TEAM_COLOR,
          } as CSSProperties
        }
      >
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Form check
        </p>
        <h2
          id="mclaren-form"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          Monza is a different test for McLaren
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          McLaren won in Hungary and Zandvoort, both high-downforce races.
          Andrea Stella says the MCL40 has been weaker on drag and braking.
          Monza will test both. Check Norris and Piastri&rsquo;s straight-line
          speed and braking stability on Friday before carrying their recent
          form into your picks.{' '}
          <ExternalSource href={MCLAREN_FORM_SOURCE}>
            Read Stella&rsquo;s assessment
          </ExternalSource>
          .
        </p>
      </div>
    </section>
  );
}

/**
 * The three nominated compounds, hardest first.
 *
 * The colours are Pirelli's sidewall bands, which makes them data about the
 * sport rather than palette decisions: the same standing as a team's livery in
 * `tokens.ts`, and read the same way, as a thin band and never as a fill. They
 * are local to this page because nothing else in the app names a compound yet;
 * the second surface that does should move them into the shared tokens beside
 * `teams`.
 */
const TYRE_COMPOUNDS = [
  { compound: 'C3', role: 'hard', band: '#f0f0f0' },
  { compound: 'C4', role: 'medium', band: '#ffd500' },
  { compound: 'C5', role: 'soft', band: '#da291c' },
] as const;

/** A tyre read end-on: the band is the compound, the hub is just the wheel. */
function CompoundBand({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px]"
      style={{ borderColor: color }}
    >
      <span className="h-3.5 w-3.5 rounded-full border border-border" />
    </span>
  );
}

/**
 * The compound nomination, as analysis rather than as news.
 *
 * It fails the `raceNews` bar on purpose: every car gets the same three
 * compounds, so there is no driver it moves in a direction, and
 * `affectsSessions` would be answering for the whole grid at once. That is the
 * line `docs/race-news.md` draws between an event and the circuit, and this is
 * the circuit side of it.
 *
 * No team bar, unlike the two sections below. The bar means "this is a team's
 * story" and is drawn in that team's colour; a tyre nomination belongs to
 * nobody on the grid, and inventing a colour for Pirelli would spend the
 * mechanism on the one section that has no claim to it.
 */
function TyreChoice() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="tyre-choice">
      <div className="max-w-3xl">
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Tyre choice
        </p>
        <h2
          id="tyre-choice"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          Pirelli brings its softest tyres to Monza
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          C3, C4 and C5 is the softest combination in the 2026 range, and Monza
          is the quickest track it gets used on. That sounds like a two-stop
          race.
        </p>
      </div>

      {/* The same gap-px strip as the circuit stats above, because the job is
          the same: three values a reader should be able to take without
          reading a sentence.

          Two things it does that the stats strip does not, both because three
          cells across a full-width row leave a lot of air:

          - Each cell carries its sidewall band, which is how anybody watching
            actually tells the compounds apart. It is the mapping people came
            for, said in the form they already know.
          - The content is centred rather than left-aligned. A stat reads as a
            figure in a column; this reads as a set of three, and the set is
            ordered hardest to softest so the row itself is the scale. */}
      <dl className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-sm bg-border">
        {TYRE_COMPOUNDS.map(({ compound, role, band }) => (
          <div
            key={compound}
            className="flex flex-col items-center gap-3 bg-surface px-3 py-5 sm:flex-row sm:justify-center sm:gap-4 sm:px-5"
          >
            <CompoundBand color={band} />
            <div className="flex flex-col-reverse items-center sm:items-start">
              <dt className="mt-1 text-xs tracking-label text-text-muted uppercase">
                {role}
              </dt>
              <dd className="gpp-mono text-2xl text-text">{compound}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-7 max-w-3xl">
        <p className="gpp-reading-copy text-text-muted">
          Monza asks less of a tyre sideways than anywhere else on the calendar,
          and lateral load is what usually finishes off a soft compound. Most of
          the lap is full throttle, and what is left goes through the brakes and
          the traction zones out of the chicanes. The C5 may last longer than
          its name suggests.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Which way it falls is a thing to read off Friday long runs rather than
          guess from the nomination. A one-stop puts the value back on track
          position, and on qualifying pace with it. A two-stop rewards the
          drivers who look after a tyre over the ones who are quick for a lap.{' '}
          <ExternalSource href={TYRE_SOURCE}>
            Read Pirelli&rsquo;s selection
          </ExternalSource>
          .
        </p>
      </div>
    </section>
  );
}

/**
 * Colour, kept as prose on purpose.
 *
 * It changes no pick, so it fails the bar for `raceNews` and would be rejected
 * by `affectsSessions` if anyone tried to publish it. It earns a paragraph here
 * only so a differently coloured Ferrari on Friday does not read as a different
 * car. See `docs/race-news.md` for where that line sits.
 */
function FerrariTribute() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="ferrari-tribute">
      {/* The one section whose subject is a team's own colour, so it gets the
          same 3px bar the driver badges use rather than a fourth kind of
          accent. Ferrari red is read from the tokens, not typed in here. */}
      <div
        className="gpp-team-bar max-w-3xl pl-4"
        style={
          {
            '--team-colour': TEAM_COLORS.Ferrari ?? FALLBACK_TEAM_COLOR,
          } as CSSProperties
        }
      >
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Weekend colour
        </p>
        <h2
          id="ferrari-tribute"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          Ferrari runs a Schumacher tribute
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Ferrari has teased a one-off SF-26 livery for its home race, reported
          as red with black accents and gold wheels after the 1996 F310. It
          marks thirty years since Schumacher&rsquo;s first season in red and
          his Italian Grand Prix win that year.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Ferrari has yet to reveal the car, so treat the reported details as
          unconfirmed. Use practice pace to judge Leclerc and Hamilton.{' '}
          <ExternalSource href={LIVERY_SOURCE}>Read the report</ExternalSource>.
        </p>
      </div>
    </section>
  );
}

/*
 * Deliberately a write-up section and not a `raceNews` item.
 *
 * A contract that starts in 2028 changes nothing about who you put in a Top 5
 * this weekend, so `affectsSessions` has no honest answer and the editorial
 * gate in `docs/race-news.md` rejects it. It is still the biggest thing said
 * about a McLaren driver in the week of Monza, which is what a write-up is for.
 */
function NorrisContract() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="norris-contract">
      <div
        className="gpp-team-bar max-w-3xl pl-4"
        style={
          {
            '--team-colour': TEAM_COLORS.McLaren ?? FALLBACK_TEAM_COLOR,
          } as CSSProperties
        }
      >
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Off track
        </p>
        <h2
          id="norris-contract"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          Norris re-signs with McLaren to 2030
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          McLaren has confirmed a new deal keeping Lando Norris at the team
          until at least the end of 2030, with a multi-year option beyond that.
          He joined as a test and development driver in 2017 and has raced for
          them since 2019. Oscar Piastri is contracted to the end of 2028, so
          the pairing you pick between is settled for a while yet.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Norris and Piastri remain McLaren&rsquo;s Monza pairing. Use the deal
          as background to their on-track fight.{' '}
          <ExternalSource href={NORRIS_CONTRACT_SOURCE}>
            Read the announcement
          </ExternalSource>
          .
        </p>
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
      className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
