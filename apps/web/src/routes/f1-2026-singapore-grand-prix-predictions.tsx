import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';

import { Flag } from '@/components/Flag';
import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceSignalsSection } from '@/components/race-writeups/RaceSignalsSection';
import { TyreCompoundSection } from '@/components/race-writeups/TyreCompoundSection';
import { RaceWriteupActions } from '@/components/race-writeups/RaceWriteupActions';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupPhaseLabel } from '@/components/race-writeups/RaceWriteupPhaseLabel';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
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

const RACE_SLUG = 'singapore-2026';
const PATH = '/f1-2026-singapore-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/singapore';
const SPRINT_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY.3PyLPAazrBNe8kQIS3wOfY';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compound-selections-for-baku-sepang-and-singapore/';
const HEAT_SOURCE =
  'https://press.pirelli.com/managing-the-heat-under-the-lights-in-singapore/';

const FAQS = [
  {
    question: 'Is the 2026 Singapore Grand Prix a sprint weekend?',
    answer:
      'Yes. Singapore hosts its first Formula 1 sprint weekend in 2026. Sprint Qualifying follows the only practice session on Friday, the Sprint and Grand Prix Qualifying run on Saturday, and the Grand Prix is on Sunday.',
  },
  {
    question: 'When is the 2026 Singapore Grand Prix?',
    answer:
      'The weekend runs from 9 to 11 October 2026 at Marina Bay. The Sprint starts at 17:00 Singapore time on Saturday and the 62-lap Grand Prix starts at 20:00 on Sunday.',
  },
  {
    question: 'How many practice sessions are there in Singapore?',
    answer:
      'One. Practice 1 runs on Friday before Sprint Qualifying. There is no second or third practice session on a sprint weekend.',
  },
  {
    question: 'How are Singapore Grand Prix predictions scored?',
    answer:
      'Each session scores separately. An exact Top 5 position earns 5 points, one position away earns 3, and selecting a driver who finishes elsewhere in the actual Top 5 earns 1 point.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-singapore-grand-prix-predictions',
)({
  component: SingaporeGrandPrixPredictionsPage,
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
    const title = '2026 Singapore Grand Prix Predictions & Sprint Picks';
    const description =
      race?.status === 'finished'
        ? '2026 Singapore Grand Prix predictions scored against the official Marina Bay classification. See who called the top 5 across the sprint and the race.'
        : race?.status === 'cancelled'
          ? 'The 2026 Singapore Grand Prix was called off.'
          : 'Make your 2026 Singapore Grand Prix and Sprint predictions. Marina Bay hosts its first sprint weekend, with one practice session.';
    const circuit = getCircuitForRace(RACE_SLUG);
    const meta = pageMeta({
      title,
      description,
      path: PATH,
      image: raceOgImageUrl(RACE_SLUG),
      imageAlt:
        'Grand Prix Picks race card for the 2026 Singapore Grand Prix at Marina Bay.',
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
                        name: '2026 Singapore Grand Prix',
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
                { name: 'Singapore Grand Prix predictions', path: PATH },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function SingaporeGrandPrixPredictionsPage() {
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
              <Flag code="SG" size="xl" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted uppercase">
                  09–11 Oct · Marina Bay · Round {race.round}
                </p>
                <span className="text-text-disabled" aria-hidden>
                  ·
                </span>
                <RaceWriteupPhaseLabel phase={phase} />
              </div>
            </div>
            <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
              Singapore Grand Prix 2026 predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              {raceWriteupHeroSummary(
                phase,
                'The Singapore Grand Prix',
                'Singapore hosts its first sprint weekend. One practice session has to answer every question before the competitive running starts.',
              )}
            </p>
            <RaceWriteupActions
              phase={phase}
              raceSlug={RACE_SLUG}
              venueName="Singapore"
              circuitName="Marina Bay"
              circuitSlug="marina-bay"
            />
          </header>

          <RaceWriteupWeekendSchedule
            race={race}
            timeZone="Asia/Singapore"
            timeZoneLabel="Singapore time"
            weather={isLive ? weather : null}
            now={weatherNow}
          />
        </div>

        <FirstSingaporeSprint />
        <WatchTable />
        <TyreChoice />
        <SaturdayEvidence />
        {isLive ? (
          <>
            <WeekendNewsSection items={news.items} />
            <WeekendPracticeSection results={practice} raceSlug={RACE_SLUG} />
            <RaceWriteupChampionshipContext
              championship={championship}
              races={season.races}
              thisRound={race.round}
              venueName="Singapore"
            />
          </>
        ) : null}

        <RaceFaqSection faqs={FAQS} />

        <RaceWriteupClosingPanel
          phase={phase}
          raceSlug={RACE_SLUG}
          venueName="Singapore"
        />

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Schedule and circuit:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
            Sprint format:{' '}
            <ExternalSource href={SPRINT_SOURCE}>
              FIA and Formula 1
            </ExternalSource>
            . Tyres: <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>
            . Heat and strategy:{' '}
            <ExternalSource href={HEAT_SOURCE}>Pirelli</ExternalSource>.
          </p>
          <p className="gpp-mono mt-2 text-xs">
            LAST REVIEWED {reviewedStamp(PROSE_REVIEWED_AT)}
          </p>
        </footer>
      </div>
    </div>
  );
}

function FirstSingaporeSprint() {
  const sessions = [
    ['Friday', 'Practice 1', 'Only setup and long-run sample'],
    ['Friday', 'Sprint Qualifying', 'First competitive classification'],
    ['Saturday', 'Sprint', 'Race-pace evidence'],
    ['Saturday', 'Qualifying', 'Grand Prix grid'],
    ['Sunday', 'Grand Prix', '62 laps'],
  ] as const;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="first-sprint">
      <div className="max-w-3xl">
        <h2
          id="first-sprint"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          One hour of practice before the first pick locks
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Marina Bay has never hosted the sprint format. Friday has one practice
          session, followed by Sprint Qualifying that evening. The usual second
          and third practice sessions are replaced by competitive running.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          That makes the first hour unusually valuable. Teams have to establish
          ride height, cooling and tyre behaviour on a street circuit that gains
          grip throughout the weekend, then commit before they have a second
          long-run sample.{' '}
          <Link
            to="/guides/$guideSlug"
            params={{ guideSlug: 'f1-sprint-weekends-explained' }}
            className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
          >
            How sprint weekends work
          </Link>
          .
        </p>
      </div>

      <ol className="mt-7 grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-5">
        {sessions.map(([day, session, note], index) => (
          <li key={session} className="bg-surface p-4 sm:p-5">
            <p className="gpp-mono text-xs text-text-muted">
              {String(index + 1).padStart(2, '0')} · {day.toUpperCase()}
            </p>
            <h3 className="font-title mt-2 font-medium text-text">{session}</h3>
            <p className="mt-2 text-xs leading-5 text-text-muted">{note}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WatchTable() {
  return (
    <RaceSignalsSection
      heading="What matters at Marina Bay"
      stats={[
        ['4.927', 'km circuit'],
        ['62', 'race laps'],
        ['19', 'turns'],
        ['20:00', 'local start'],
      ]}
      signals={[
        [
          'Low-speed traction',
          'Drive out of the slow corners',
          'The lap repeatedly asks the rear tyres to find grip beside a wall. Poor traction costs time all the way down the next straight.',
        ],
        [
          'Kerb and bump control',
          'How settled the car stays over the street surface',
          'A nervous car forces a driver to leave margin. That margin adds up across a long lap with little run-off.',
        ],
        [
          'Cooling',
          'Brake, power-unit and cockpit temperatures',
          'The race starts at night, but the heat and humidity remain. Opening bodywork for cooling costs performance.',
        ],
        [
          'Driver accuracy',
          'Missed apexes and wall contact late in a run',
          'Concentration matters across a race that often approaches two hours. Small errors have no run-off to absorb them.',
        ],
      ]}
    >
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Track position, traction and mistake-free laps. Passing remains hard, so
        qualifying carries more weight here than at Baku or Sepang.
      </p>
    </RaceSignalsSection>
  );
}

function TyreChoice() {
  return (
    <TyreCompoundSection
      heading="Singapore gets the softest three tyres"
      venue="Singapore"
      hardest="C3"
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        Pirelli selected C3, C4 and C5, the same softest trio used at Baku.
        Marina Bay is dominated by traction and low-speed grip, while the street
        surface evolves as rubber goes down.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The heat can push the rear tyres towards overheating even when wear is
        manageable. Watch the Sprint for degradation, but remember that the
        Grand Prix runs later and over a much longer distance.{' '}
        <ExternalSource href={TYRE_SOURCE}>
          Pirelli&rsquo;s selection
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
  );
}

function SaturdayEvidence() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="saturday-evidence">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <h2
            id="saturday-evidence"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            The Sprint is the only race-pace evidence before qualifying
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            The Sprint comes four hours before Grand Prix Qualifying. It shows
            tyre behaviour, traffic pace and who can keep the car out of the
            walls, but it does not set Sunday&rsquo;s grid.
          </p>
          <p className="gpp-reading-copy mt-3 text-text-muted">
            Use the Sprint to update the back of your Grand Prix Top 5. Keep
            qualifying weighted heavily: Marina Bay still rewards track
            position, even when one driver looked quicker over the short race.
          </p>
        </div>
        <div className="self-start rounded-sm bg-surface-elevated p-5">
          <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
            Pick order
          </p>
          <ol className="mt-4 space-y-3 text-sm text-text">
            <li>1. Sprint Qualifying Top 5</li>
            <li>2. Sprint Top 5</li>
            <li>3. Grand Prix Qualifying Top 5</li>
            <li>4. Grand Prix Top 5</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
