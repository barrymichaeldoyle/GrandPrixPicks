import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { Flag } from '@/components/Flag';
import { RaceWriteupActions } from '@/components/race-writeups/RaceWriteupActions';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupPhaseLabel } from '@/components/race-writeups/RaceWriteupPhaseLabel';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import { WeekendWeatherForecast } from '@/components/weather/WeekendWeatherForecast';
import {
  lastReviewedAt,
  reviewedIsoDate,
  reviewedStamp,
} from '@/lib/lastReviewed';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
} from '@/lib/raceWriteupPhase';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';
import { routeQuery } from '@/lib/routeQuery';
import {
  breadcrumbSchema,
  pageMeta,
  raceOgImageUrl,
  siteConfig,
  sportsEventSchema,
} from '@/lib/site';

import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

const RACE_SLUG = 'azerbaijan-2026';
const PATH = '/f1-2026-azerbaijan-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/azerbaijan';
const SATURDAY_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-confirms-2026-pre-season-testing-dates-and-issues-calendar-update.5VKfdqe7JcdsCJcEnQE0xw';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compound-selections-for-baku-sepang-and-singapore/';
const FORM_SOURCE =
  'https://www.formula1.com/en/latest/article/strategy-guide-what-are-the-tactical-options-for-the-azerbaijan-grand-prix.7tfp6ZvfiLy6dJ0D598abf.7tfp6ZvfiLy6dJ0D598abf';
const RACE_SOURCE =
  'https://www.formula1.com/en/latest/article/what-the-teams-said-race-day-in-azerbaijan-2025.6AWm00FUiNNbYWhkFqRjLH';

const FAQS = [
  {
    question: 'Why is the 2026 Azerbaijan Grand Prix on a Saturday?',
    answer:
      'Formula 1 and the FIA moved the race from Sunday 27 September to Saturday 26 September at the promoter’s request, to accommodate a national day. Every session moved one day earlier, so practice starts on Thursday and qualifying is on Friday.',
  },
  {
    question: 'When is the 2026 Azerbaijan Grand Prix?',
    answer:
      'The weekend runs from Thursday 24 to Saturday 26 September 2026 in Baku. Qualifying starts at 16:00 Baku time on Friday and the 51-lap Grand Prix starts at 15:00 on Saturday.',
  },
  {
    question: 'Is Baku a street circuit?',
    answer:
      'Yes. The 6.003-kilometre Baku City Circuit uses public roads, including the narrow section through the old city and the long flat-out run to Turn 1.',
  },
  {
    question: 'How are Azerbaijan Grand Prix predictions scored?',
    answer:
      'An exact Top 5 position earns 5 points, one position away earns 3, and selecting a driver who finishes elsewhere in the actual Top 5 earns 1 point.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-azerbaijan-grand-prix-predictions',
)({
  component: AzerbaijanGrandPrixPredictionsPage,
  loader: async ({ context }) => {
    await setRaceDataCacheHeaders();
    const weatherNow = Date.now();
    const [race, championship, weather, news, season, practice] =
      await Promise.all([
        context.queryClient.ensureQueryData(
          routeQuery(api.races.getRaceBySlug, { slug: RACE_SLUG }),
        ),
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
        context.queryClient.ensureQueryData(
          routeQuery(api.races.listCurrentSeason, {}),
        ),
        context.queryClient.ensureQueryData(
          routeQuery(api.practiceResults.getPracticeResultsForRaceSlug, {
            raceSlug: RACE_SLUG,
          }),
        ),
      ]);
    if (!race) {
      throw notFound();
    }
    return { race, championship, weather, weatherNow, news, season, practice };
  },
  head: ({ loaderData }) => {
    const race = loaderData?.race;
    const title = '2026 Azerbaijan Grand Prix Predictions & Picks | Baku';
    const description =
      race?.status === 'finished'
        ? '2026 Azerbaijan Grand Prix predictions scored against the official Baku classification. See who called the top 5 on a street circuit that punishes a mistake.'
        : race?.status === 'cancelled'
          ? 'The 2026 Azerbaijan Grand Prix was called off.'
          : 'Make your 2026 Azerbaijan Grand Prix predictions. Baku races on Saturday this year, with practice starting Thursday. Pick a top 5 for every session.';
    const circuit = getCircuitForRace(RACE_SLUG);
    const meta = pageMeta({
      title,
      description,
      path: PATH,
      image: raceOgImageUrl(RACE_SLUG),
      imageAlt:
        'Grand Prix Picks race card for the 2026 Azerbaijan Grand Prix at Baku City Circuit.',
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
                ...(race && circuit
                  ? {
                      about: sportsEventSchema({
                        name: '2026 Azerbaijan Grand Prix',
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
                { name: 'Azerbaijan Grand Prix predictions', path: PATH },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function AzerbaijanGrandPrixPredictionsPage() {
  const { race, championship, weather, weatherNow, news, season, practice } =
    Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="gpp-stripe grid gap-8 overflow-hidden rounded-sm bg-surface px-5 py-7 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <header>
            <div className="flex items-center gap-3">
              <Flag code="AZ" size="xl" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted">
                  24–26 SEP · BAKU · ROUND {race.round}
                </p>
                <span className="text-text-disabled" aria-hidden>
                  ·
                </span>
                <RaceWriteupPhaseLabel phase={phase} />
              </div>
            </div>
            <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
              Azerbaijan Grand Prix 2026 predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              {raceWriteupHeroSummary(
                phase,
                'The Azerbaijan Grand Prix',
                'Baku races on Saturday this year. The long straight rewards efficiency; the old-city walls punish every mistake.',
              )}
            </p>
            <RaceWriteupActions
              phase={phase}
              raceSlug={RACE_SLUG}
              venueName="Baku"
              circuitName="Baku"
              circuitSlug="baku"
            />
          </header>

          <RaceWriteupWeekendSchedule
            race={race}
            timeZone="Asia/Baku"
            timeZoneLabel="BAKU TIME"
          />
        </div>

        {isLive ? (
          <WeekendWeatherForecast
            race={race}
            weather={weather}
            now={weatherNow}
          />
        ) : null}

        <SaturdayRace />
        <WatchTable />
        <TyreChoice />
        <RiskAndRecovery />
        {isLive ? (
          <>
            <WeekendNewsSection items={news.items} />
            <WeekendPracticeSection results={practice} raceSlug={RACE_SLUG} />
            <RaceWriteupChampionshipContext
              championship={championship}
              races={season.races}
              thisRound={race.round}
              venueName="Baku"
            />
          </>
        ) : null}

        <section className="py-8 sm:py-16" aria-labelledby="common-questions">
          <h2
            id="common-questions"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
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
          venueName="Baku"
        />

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Schedule and circuit:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
            Saturday change:{' '}
            <ExternalSource href={SATURDAY_SOURCE}>Formula 1</ExternalSource>.
            Tyres: <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>.
            2025 form:{' '}
            <ExternalSource href={FORM_SOURCE}>Formula 1</ExternalSource> and{' '}
            <ExternalSource href={RACE_SOURCE}>Pirelli</ExternalSource>.
          </p>
          <p className="gpp-mono mt-2 text-xs">
            LAST REVIEWED {reviewedStamp(PROSE_REVIEWED_AT)}
          </p>
        </footer>
      </div>
    </div>
  );
}

function SaturdayRace() {
  return (
    <section
      className="grid gap-7 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-labelledby="saturday-race"
    >
      <div>
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Calendar change
        </p>
        <h2
          id="saturday-race"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          The Grand Prix is on Saturday
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          The Azerbaijan Grand Prix was originally due on Sunday 27 September.
          Formula 1 and the FIA moved it to Saturday 26 September at the
          promoter&rsquo;s request, to accommodate a national day.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          The entire programme moved with it. Practice starts on Thursday,
          qualifying is Friday, and race picks lock on Saturday. The sessions
          are in their usual order; only the days changed.{' '}
          <ExternalSource href={SATURDAY_SOURCE}>
            Formula 1 announcement
          </ExternalSource>
          .
        </p>
      </div>
      <dl className="self-start rounded-sm bg-surface-elevated px-4">
        {[
          ['Thursday', 'Practice 1 and Practice 2'],
          ['Friday', 'Practice 3 and Qualifying'],
          ['Saturday', 'Grand Prix'],
          ['Race start', '15:00 Baku time'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-b border-border py-4 last:border-0"
          >
            <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
              {label}
            </dt>
            <dd className="mt-2 text-sm text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WatchTable() {
  const rows = [
    [
      'Straight-line efficiency',
      'Speed from Turn 16 to Turn 1',
      'The flat-out run is long enough to expose drag. A car that reaches the straight slowly keeps paying for it for almost two kilometres.',
    ],
    [
      'Old-city confidence',
      'Commitment through Turns 8 to 12',
      'The road narrows beside the castle walls. A driver who leaves margin loses time that cannot be recovered in that sector.',
    ],
    [
      'Braking stability',
      'Lock-ups at Turns 1 and 3',
      'Both stops follow high speed and offer passing chances. A weak front end costs lap time and invites an overtake.',
    ],
    [
      'Wind direction',
      'Changes in braking points and tow strength',
      'The exposed straights make the lap sensitive to gusts. A braking reference that worked on one lap can move on the next.',
    ],
  ] as const;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="what-to-watch">
      <div className="max-w-3xl">
        <h2
          id="what-to-watch"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          What matters in Baku
        </h2>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Baku asks for low drag on its enormous straight and grip through the
          slow old-city section. Every setup gives something away.
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-4">
        {[
          ['6.003', 'km circuit'],
          ['51', 'race laps'],
          ['20', 'turns'],
          ['15:00', 'local start'],
        ].map(([value, label]) => (
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
        <div
          className="hidden grid-cols-[10rem_1fr_1fr] gap-8 px-4 pb-3 text-xs font-semibold tracking-label text-text-muted uppercase sm:grid sm:px-5"
          aria-hidden
        >
          <span>Signal</span>
          <span>Look for</span>
          <span>Why it matters</span>
        </div>
        <div className="rounded-sm bg-surface px-4 sm:px-5">
          {rows.map(([signal, check, reason]) => (
            <div
              key={signal}
              className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[10rem_1fr_1fr] sm:gap-8"
            >
              <h3 className="font-title text-sm font-medium text-text">
                {signal}
              </h3>
              <p className="text-sm leading-6 text-text">{check}</p>
              <p className="text-sm leading-6 text-text-muted">{reason}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TYRE_RANGE = [
  { compound: 'C1', role: null, band: null },
  { compound: 'C2', role: null, band: null },
  { compound: 'C3', role: 'hard', band: '#f0f0f0' },
  { compound: 'C4', role: 'medium', band: '#ffd500' },
  { compound: 'C5', role: 'soft', band: '#da291c' },
] as const;

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
          Baku gets the softest three tyres
        </h2>
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
              <p
                className={`gpp-mono text-xl sm:text-2xl ${role ? 'text-text' : 'text-text-muted'}`}
              >
                {compound}
              </p>
              <p
                className={
                  role
                    ? 'mt-1 text-[10px] tracking-label text-text-muted uppercase sm:text-xs'
                    : 'sr-only'
                }
              >
                {role ?? 'Not used at Baku'}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between gap-4 text-[10px] tracking-label text-text-muted uppercase sm:text-xs">
          <span>Lasts longer</span>
          <span>More grip</span>
        </div>
        <p className="gpp-reading-copy mt-7 text-text-muted">
          Pirelli selected C3, C4 and C5. Baku generally produces low
          degradation, and the one-stop has often been the quickest route even
          when a softer range is available.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          The strategic question is timing. A Safety Car can make a stop cheap,
          but waiting for one that never arrives leaves a driver on old tyres.
          The 2025 race stayed a straightforward one-stop after its early Safety
          Car.{' '}
          <ExternalSource href={TYRE_SOURCE}>
            Pirelli&rsquo;s selection
          </ExternalSource>
          .
        </p>
      </div>
    </section>
  );
}

function RiskAndRecovery() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="risk-and-recovery">
      <div className="max-w-3xl">
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Pick risk
        </p>
        <h2
          id="risk-and-recovery"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          A mixed grid does not guarantee a recovery drive
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Baku qualifying can produce a strange order because the walls punish
          small mistakes. In 2025, qualifying set a record for red flags, but
          the race then settled into DRS trains and a one-stop strategy.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Do not move every front-runner straight back into your Top 5 after a
          poor qualifying result. The main straight creates passes, but the
          narrow technical section and low tyre degradation can also keep a
          train together. Separate drivers who were quick before an isolated
          mistake from cars that lacked pace all weekend.
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
