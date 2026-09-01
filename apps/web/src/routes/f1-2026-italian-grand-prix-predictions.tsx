import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight, Plus } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';
import { Flag } from '@/components/Flag';
import { RaceWriteupActions } from '@/components/race-writeups/RaceWriteupActions';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupPhaseLabel } from '@/components/race-writeups/RaceWriteupPhaseLabel';
import { RaceWriteupTrackMap } from '@/components/race-writeups/RaceWriteupTrackMap';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WriteUpNewsPhoto } from '@/components/WriteUpNewsPhoto';
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
import { SCHUMACHER_TRIBUTE_WRITEUP_IMAGE } from '@/lib/italy2026WriteUpImages';
import {
  breadcrumbSchema,
  pageMeta,
  raceOgImageUrl,
  siteConfig,
  sportsEventSchema,
} from '@/lib/site';

import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

/** The date the hand-written prose on this page was last checked. */
const PROSE_REVIEWED = getRaceWriteupReviewedAt('italy-2026');

const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const PATH = '/f1-2026-italian-grand-prix-predictions';
const RACE_SLUG = 'italy-2026';
const HADJAR_SOURCE =
  'https://www.skysports.com/f1/news/12433/13575278/isack-hadjar-red-bull-driver-hopeful-of-monza-return-after-wrist-injury-forces-him-out-of-dutch-grand-prix';
const HADJAR_DECISION_SOURCE =
  'https://www.gpblog.com/en/news/hadjar-or-lawson-alongside-verstappen-at-red-bull-heres-when-red-bull-will-decide';
const LIVERY_SOURCE =
  'https://www.motorsport.com/f1/news/ferrari-unveils-michael-schumacher-inspired-f1-livery-for-italian-gp/10851263/';
const SUITS_SOURCE =
  'https://www.motorsport.com/f1/news/ferrari-pays-tribute-to-michael-schumacher-with-special-italian-gp-race-suits/10850114/';
const NORRIS_CONTRACT_SOURCE =
  'https://www.formula1.com/en/latest/article/lando-norris-commits-future-to-mclaren-as-he-signs-new-deal-until-the-end-of-2030.7ErHTktjoW2mAo5zEEtuA0';
const COLAPINTO_CONTRACT_SOURCE =
  'https://www.formula1.com/en/latest/article/alpine-announce-colapinto-contract-extension-as-team-confirms-unchanged-2027-line-up.DL3dVyZLJm5cHryWcHyPq';
const MCLAREN_FORM_SOURCE =
  'https://www.motorsport.com/f1/news/why-mclaren-must-pass-its-monza-test-before-talking-about-an-f1-title-challenge/10849795/';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compounds-selected-for-zandvoort-monza-and-madrid/';
const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/italy';
const F1_STANDINGS_SOURCE = 'https://www.formula1.com/en/results/2026/drivers';

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
        race?.status === 'finished'
          ? '2026 Italian Grand Prix predictions, official Monza results, and how they scored.'
          : race?.status === 'cancelled'
            ? 'The 2026 Italian Grand Prix was called off.'
            : 'Make your 2026 Italian Grand Prix predictions. Antonelli’s grid penalty does not change his qualifying classification.';
      const circuit = getCircuitForRace(RACE_SLUG);
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
                          name: '2026 Italian Grand Prix',
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

function ItalianGrandPrixPredictionsPage() {
  const { race, weather, weatherNow, news, championship } =
    Route.useLoaderData();
  // One roster lookup for the sections that name drivers, so a badge and the
  // standings beside it can never disagree about a seat.
  const driversByCode = new Map(
    championship.drivers.map((driver) => [driver.code, driver]),
  );
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="gpp-stripe grid gap-8 overflow-hidden rounded-sm bg-surface px-5 py-7 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <header>
            <div className="flex items-center gap-3">
              <Flag code="IT" size="xl" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted">
                  04–06 SEP · MONZA · ROUND {race.round}
                </p>
                <span className="text-text-disabled" aria-hidden>
                  ·
                </span>
                <RaceWriteupPhaseLabel phase={phase} />
              </div>
            </div>
            <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
              Italian Grand Prix 2026 predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              {raceWriteupHeroSummary(
                phase,
                'The Italian Grand Prix',
                'Straight-line speed, braking into the chicanes, and long-run pace decide a Monza Top 5.',
              )}
            </p>
            <RaceWriteupActions
              phase={phase}
              raceSlug={RACE_SLUG}
              venueName="Monza"
              circuitName="Monza"
              circuitSlug="monza"
            />
          </header>

          <RaceWriteupWeekendSchedule
            race={race}
            timeZone="Europe/Rome"
            timeZoneLabel="MONZA TIME"
          />
        </div>

        {isLive ? (
          <>
            <WeekendWeatherForecast
              race={race}
              weather={weather}
              now={weatherNow}
            />
            <WeekendNewsSection items={news.items} />
          </>
        ) : null}
        <WatchTable />
        <TrackMap />
        <TyreChoice />
        {/* Hadjar and the standings both carry a right-hand card; the tribute
            and the contracts do not. Run the two carded sections together so
            the rail does not appear, vanish and reappear, and let the
            prose-only asides follow. */}
        {isLive ? (
          <>
            <HadjarStatus byCode={driversByCode} />
            <ChampionshipContext championship={championship} />
            <McLarenForm />
            <FerrariTribute />
            <NorrisContract />
            <ColapintoContract />
            <PredictionMethod />
          </>
        ) : null}

        <section className="py-8 sm:py-16" aria-labelledby="common-questions">
          <h2
            id="common-questions"
            className="font-title text-2xl font-medium text-text"
          >
            Common questions
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

        <RaceWriteupClosingPanel
          phase={phase}
          raceSlug={RACE_SLUG}
          venueName="Monza"
        />

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Race facts and schedule:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
            Driver availability:{' '}
            <ExternalSource href={HADJAR_SOURCE}>Sky Sports</ExternalSource>.
          </p>
          <p className="gpp-mono mt-2 text-xs">
            LAST REVIEWED {reviewedStamp(PROSE_REVIEWED_AT)}
          </p>
        </footer>
      </div>
    </div>
  );
}

function WatchTable() {
  const rows = [
    [
      'Straight-line pace',
      'Speed without relying on a tow',
      'A car with low drag is quick on every lap. A tow only helps when there is a car close ahead.',
    ],
    [
      'Heavy braking',
      'A settled car into Rettifilo (Turns 1–2) and Roggia (Turns 4–5)',
      'Lock-ups or poor rotation make overtaking and tyre life harder.',
    ],
    [
      'Corner exits',
      'Traction out of the chicanes',
      'A weak exit gives away speed for the length of the next straight.',
    ],
    [
      'Long runs',
      'Consistent pace over several laps',
      'A qualifying lap says nothing about how a car holds its tyres over a stint.',
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
          braking, and long runs.
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-4">
        {[
          ['5.793', 'km circuit'],
          ['53', 'race laps'],
          ['80%', 'full throttle'],
          ['1.2', 'km main straight'],
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

/**
 * The map earns its place by answering a question the prose above cannot: not
 * what to watch, but *where*. Everything it marks is geography that outlives
 * the weekend, so nothing in here needs bumping when the entry list changes.
 *
 * It is a raster rather than the drawn SVG it replaces, recoloured onto the
 * design tokens: the artwork arrived on a purple ground, and a picture is not
 * exempt from the palette just because it is a picture. The three sector lines
 * keep the F1 sector colours the SVG used, on the same grounds the SVG kept
 * them — those are data about the sport rather than palette choices.
 *
 * `CORNERS` is the bridge between the numbers on the map and the names used in
 * the prose on this page. Any corner named anywhere on the page appears here
 * with the number that identifies it on the artwork.
 */
const CORNERS = [
  ['1–2', 'Rettifilo'],
  ['3', 'Curva Grande'],
  ['4–5', 'Roggia'],
  ['6–7', 'Lesmo'],
  ['8–10', 'Ascari'],
  ['11', 'Parabolica'],
] as const;

function TrackMap() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="track-map">
      <div className="max-w-3xl">
        <h2
          id="track-map"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          Where overtakes happen
        </h2>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Monza has four straight-mode zones. Three end in heavy braking:
          Rettifilo (Turns 1–2), Roggia (Turns 4–5) and Ascari (Turns 8–10).
        </p>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)] lg:items-start">
        <RaceWriteupTrackMap
          src="/media/monza-track-map-1600.webp"
          srcSet="/media/monza-track-map-800.webp 800w, /media/monza-track-map-1600.webp 1600w"
          sizes="(min-width: 1024px) 38rem, 100vw"
          width={1600}
          height={893}
          circuitName="Monza"
          corners={CORNERS}
          alt="Monza lap map. Turns are numbered 1 to 11 clockwise from the end of the main straight, with the three sectors, four straight-mode zones, the speed trap on the main straight, and the Overtake detection and activation points either side of Turn 11."
        />

        <div className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7">
          <p className="gpp-reading-copy text-text-muted">
            The fourth ends at Parabolica (Turn 11), which is quicker and
            lighter on the brakes than the three chicanes. Overtake detection
            sits just before it, so a driver who gets through there close behind
            keeps the tow onto the main straight and can use Overtake down it,
            into Rettifilo. That is where most passes happen.
          </p>
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
          at Monza. Red Bull has not confirmed who will be driving.{' '}
          <ExternalSource href={HADJAR_DECISION_SOURCE}>GPblog</ExternalSource>{' '}
          reports the team expects to decide on Wednesday 2&nbsp;September,
          after medical checks and likely simulator running. Lawson will start
          in Hadjar&rsquo;s place if he is not fit to race.{' '}
          <ExternalSource href={HADJAR_SOURCE}>
            Sky Sports report
          </ExternalSource>
          .
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
          { label: 'Red Bull cover, and standby', code: 'LAW', note: null },
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
            from {second.displayName}. Antonelli takes a full new power unit at
            Monza and starts from the back. His qualifying result still counts
            for your qualifying picks. The penalty only changes where he starts
            on Sunday.
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
      'Rettifilo (Turns 1–2) compresses the field into one heavy stop at the end of the main straight. A pick near the back of your Top 5 carries extra opening-lap risk.',
    ],
    [
      'Resolve close calls after FP3',
      'Use final practice, weather and confirmed driver availability before separating closely matched drivers.',
    ],
  ] as const;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="build-top-five">
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
          speed and braking on Friday.{' '}
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
 * The whole 2026 slick range, hardest first, not just the three nominated here.
 *
 * Five compounds is the entire scale: Pirelli dropped the C6 for 2026 on the
 * grounds that it sat too close to the C5, so C1 to C5 is all there is and the
 * page's claim that Monza gets the soft end of the range is something the strip
 * can now show rather than assert. `role` is the tyre's job *at this race* and
 * is therefore relative: C3 is the hard tyre at Monza while sitting in the
 * middle of the range, which is the distinction the scale exists to make.
 *
 * A null `role` means the compound is not nominated for this race. Its band is
 * null with it, because the white / yellow / red sidewall is painted on the
 * three tyres that turn up, not on a place in the range.
 *
 * The colours are Pirelli's sidewall bands, which makes them data about the
 * sport rather than palette decisions: the same standing as a team's livery in
 * `tokens.ts`, and read the same way, as a thin band and never as a fill. They
 * are local to this page because nothing else in the app names a compound yet;
 * the second surface that does should move them into the shared tokens beside
 * `teams`.
 */
const TYRE_RANGE = [
  { compound: 'C1', role: null, band: null },
  { compound: 'C2', role: null, band: null },
  { compound: 'C3', role: 'hard', band: '#f0f0f0' },
  { compound: 'C4', role: 'medium', band: '#ffd500' },
  { compound: 'C5', role: 'soft', band: '#da291c' },
] as const;

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
 *
 * One column, edge to edge: heading, compound strip and closing prose all sit
 * in the same `max-w-3xl` block. The strip used to break out to the full page
 * width, which gave the section two different left-to-right extents and was
 * the only place on the page where a block did that.
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
          Monza gets the three softest tyres
        </h2>

        {/* The circuit stats strip above, exactly: gap-px cells on a border
            fill, figure in mono over a tracked micro label. It reads as a
            different component when it is centred or when it carries a drawn
            tyre, and it was doing both. Held to the reading column rather than
            breaking out to the full 5xl page width, the cells land near the
            same width as the four-up stats row, so the two strips match in
            density as well as in form.

            Showing all five is what makes it worth a graphic. Three cells said
            "C3, C4, C5 are hard, medium and soft", which is a mapping the
            heading could carry on its own. Five cells say where those three
            sit, so "the softest three" stops being a claim the reader has to
            take on trust, and the relative naming stops being confusing: the
            eye can see that Monza's hard tyre is the middle of the range.

            The sidewall band is a 3px top rule per cell rather than a drawn
            ring. Flat, and on-system as the coloured column marker the
            scoring-band card already uses. The two compounds that stay at home
            keep the rule at the same weight but dashed, which is what a dashed
            hairline already means everywhere else here: the slot exists, and
            there is nothing in it. They take the sunken fill rather than the
            page colour, because a transparent cell has no bottom edge of its
            own and left the strip visibly missing its bottom-left corner. */}
        <ul
          aria-label="Pirelli’s 2026 compound range, hardest to softest"
          className="mt-7 grid grid-cols-5 gap-px overflow-hidden rounded-sm bg-border"
        >
          {TYRE_RANGE.map(({ compound, role, band }) => (
            <li
              key={compound}
              className={
                role
                  ? 'border-t-[3px] bg-surface px-2 py-4 sm:px-5 sm:py-5'
                  : 'border-t-[3px] border-dashed border-border bg-surface-sunken px-2 py-4 sm:px-5 sm:py-5'
              }
              style={band ? { borderTopColor: band } : undefined}
            >
              {/* Muted rather than disabled ink. Disabled is the right reading
                  but it is 3.6:1 behind a 20px numeral, and the sunken fill
                  plus the dashed rule already say "empty slot" without asking
                  the one text colour in the ramp that cannot carry it. */}
              <p
                className={`gpp-mono text-xl sm:text-2xl ${role ? 'text-text' : 'text-text-muted'}`}
              >
                {compound}
              </p>
              {/* The dashed rule and the dimmed figure carry this for anyone
                  who can see them, and neither survives being read aloud. */}
              <p
                className={
                  role
                    ? 'mt-1 text-[10px] tracking-label text-text-muted uppercase sm:text-xs'
                    : 'sr-only'
                }
              >
                {role ?? 'Not used at Monza'}
              </p>
            </li>
          ))}
        </ul>

        {/* The axis carries the trade-off and nothing else. It read "Harder,
            lasts longer" against "Softer, more grip", which said half of what
            the cells underneath already say: HARD sits under C3 and SOFT under
            C5, so naming the direction again was the same idea twice, in a
            mirrored pair that sounded written rather than spoken. What is left
            is the part the row cannot show, and it is the same trade-off the
            one-stop against two-stop question below spends over a race
            distance. */}
        <div className="mt-2 flex justify-between gap-4 text-[10px] tracking-label text-text-muted uppercase sm:text-xs">
          <span>Lasts longer</span>
          <span>More grip</span>
        </div>

        <p className="gpp-reading-copy mt-7 text-text-muted">
          Tyres wear most in fast corners. Monza has few of those, so the C5 can
          last longer here than it usually does.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          A stop at Monza costs more time than at almost any other race, so
          teams will try to one-stop. Heat is the usual reason that fails, and a
          hot, dry weekend is forecast. Wear is still low at Monza, so it may
          stay a one-stop.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Friday long runs will settle it. A one-stop puts the weight on
          qualifying and track position. A second stop favours the drivers who
          look after their tyres over the ones who are only quick over a single
          lap.{' '}
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
      {/* The one write-up section wider than the `max-w-3xl` the others use.
          The prose still stops at that measure: the extra width is the margin
          the photo sits in, which would otherwise be empty page. */}
      <div
        className="gpp-team-bar pl-4"
        style={
          {
            '--team-colour': TEAM_COLORS.Ferrari ?? FALLBACK_TEAM_COLOR,
          } as CSSProperties
        }
      >
        {/* Two columns from `md` up, one on a phone. A portrait photo at the
            width of a reading column pushes every word of the section below the
            fold and stretches the Ferrari bar past the copy it marks; in the
            margin beside the text it stays a supporting picture.

            Placed explicitly rather than by source order, because the two do
            not agree. Stacked on a phone the photo belongs under the heading
            and above the prose; beside the text it starts at the top of the
            section, level with the eyebrow rather than a heading's height
            below it. The rows are `auto 1fr` so the photo's extra height lands
            in the prose row; left implicit, both rows share it and a gap opens
            between the heading and its first line. */}
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[auto_1fr] md:items-start md:gap-x-7">
          <div className="md:col-start-1 md:row-start-1 md:max-w-3xl">
            <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
              Weekend colour
            </p>
            <h2
              id="ferrari-tribute"
              className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
            >
              Ferrari runs a Schumacher tribute
            </h2>
          </div>
          <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:w-56 lg:w-72">
            <WriteUpNewsPhoto {...SCHUMACHER_TRIBUTE_WRITEUP_IMAGE} />
          </div>
          <div className="md:col-start-1 md:row-start-2 md:max-w-3xl md:min-w-0">
            <p className="gpp-reading-copy mt-4 text-text-muted">
              Ferrari has revealed a one-off SF-26 livery for Monza, thirty
              years after Schumacher&rsquo;s first season in red. The car is
              extra red, with the white gone from the engine cover, retro driver
              numbers, Schumacher&rsquo;s signature on the cover, gold on the
              BBS rims, and his seven stars on the nose. Barrichello and Vettel
              will take the F2002 around on Saturday and Sunday.
            </p>
            <p className="gpp-reading-copy mt-3 text-text-muted">
              Hamilton and Leclerc&rsquo;s race suits are out: red with white
              stripes, and seven stars on the back for Schumacher&rsquo;s
              titles.{' '}
              <ExternalSource href={SUITS_SOURCE}>
                See the race suits
              </ExternalSource>
              .{' '}
              <ExternalSource href={LIVERY_SOURCE}>
                Read the livery report
              </ExternalSource>
              .
            </p>
          </div>
        </div>
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
          them since 2019. Oscar Piastri is contracted to the end of 2028.{' '}
          <ExternalSource href={NORRIS_CONTRACT_SOURCE}>
            Read the announcement
          </ExternalSource>
          .
        </p>
      </div>
    </section>
  );
}

/*
 * Same gate as the Norris section: a 2027 seat does not change a Monza Top 5,
 * so it stays off `raceNews`. The upgrade Colapinto gets this weekend is
 * already in the feed; this is the contract.
 */
function ColapintoContract() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="colapinto-contract">
      <div
        className="gpp-team-bar max-w-3xl pl-4"
        style={
          {
            '--team-colour': TEAM_COLORS.Alpine ?? FALLBACK_TEAM_COLOR,
          } as CSSProperties
        }
      >
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Off track
        </p>
        <h2
          id="colapinto-contract"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          Colapinto stays at Alpine for 2027
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Alpine has confirmed Franco Colapinto will stay for 2027, alongside
          Pierre Gasly who is contracted to at least the end of 2028.{' '}
          <ExternalSource href={COLAPINTO_CONTRACT_SOURCE}>
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
      className="inline-block font-semibold whitespace-nowrap text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
