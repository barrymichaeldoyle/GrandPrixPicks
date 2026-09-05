import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import type { CSSProperties } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';
import { Flag } from '@/components/Flag';
import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceSignalsSection } from '@/components/race-writeups/RaceSignalsSection';
import { TyreCompoundScale } from '@/components/race-writeups/TyreCompoundSection';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupActions } from '@/components/race-writeups/RaceWriteupActions';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import {
  DeferredRaceWriteupPicks,
  RACE_WRITEUP_PICKS_ANCHOR,
} from '@/components/race-writeups/DeferredRaceWriteupPicks';
import { RaceWriteupPhaseLabel } from '@/components/race-writeups/RaceWriteupPhaseLabel';
import { RaceWriteupTrackMap } from '@/components/race-writeups/RaceWriteupTrackMap';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import { WriteUpNewsPhoto } from '@/components/WriteUpNewsPhoto';
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
  COLAPINTO_WRITEUP_IMAGE,
  HADJAR_WRITEUP_IMAGE,
  MCLAREN_PAIR_WRITEUP_IMAGE,
  MONZA_HEAT_WRITEUP_IMAGE,
  MONZA_TRACKSIDE_WRITEUP_IMAGE,
  NORRIS_WRITEUP_IMAGE,
  PIRELLI_COMPOUND_WRITEUP_IMAGE,
  SCHUMACHER_TRIBUTE_WRITEUP_IMAGE,
} from '@/lib/italy2026WriteUpImages';
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
const HADJAR_AUTOSPORT_SOURCE =
  'https://www.autosport.com/f1/news/red-bull-to-keep-dutch-gp-driver-line-up-for-monza/10851595/';
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
const MCLAREN_H_WING_MOTORSPORT_SOURCE =
  'https://www.motorsport.com/f1/news/mclaren-to-run-rotating-rear-wing-in-italy-f1-calls-it-h-wing/10851399/';
const MCLAREN_H_WING_RN365_SOURCE =
  'https://racingnews365.com/mclaren-confirm-return-of-eye-catching-f1-upgrade-at-italian-gp';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compounds-selected-for-zandvoort-monza-and-madrid/';
/** Pirelli's own Monza preview: the rebuilt kerbs, the Turn 5 run-off, the rears. */
const PIRELLI_MONZA_SOURCE =
  'https://press.pirelli.com/pirelli-headlines-italian-grand-prix-weekend-at-monza/';
const HEAT_HAZARD_SOURCE =
  'https://www.motorsport.com/f1/news/fia-declares-heat-hazard-for-f1s-italian-gp-in-monza/10851743/';
const SAFETY_CAR_SOURCE =
  'https://www.motorsport.com/f1/news/lightning-mcqueen-debuts-as-f1-track-vehicle-at-italian-gp/10851782/';

/**
 * The write-up section that carries a photo in its margin.
 *
 * Copy on the left at the page's reading measure, picture on the right, one
 * column on a phone. The two are siblings rather than the picture living inside
 * the copy's block, because the copy's block is what carries the team bar and
 * the bar has to end where the copy ends: wrapped around both, it ran the full
 * height of the taller one, which is always the photo, and drew a 3px team
 * colour down a few hundred pixels of empty page.
 *
 * `items-start` keeps the photo at the top of the section rather than centred
 * against the copy, so the tops of the two columns agree even though their
 * bottoms do not.
 */
const WRITEUP_WITH_PHOTO =
  'md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-7';

/**
 * The same section with the picture down the left instead.
 *
 * Six of these sections run within a screen or two of each other, and every one
 * of them putting the photo in the right margin turned a page of different
 * stories into one repeated template. Alternating gives the run a rhythm and,
 * more usefully, gives each section an edge the eye can tell from the last.
 *
 * The DOM order does not change: copy first, photo second, in every section,
 * mirrored or not. That is what a screen reader and a phone both get, and both
 * want the story before the illustration. The swap is grid placement only,
 * which is why the copy and photo blocks each name their column explicitly
 * rather than relying on the order they appear in.
 *
 * The cost of that is a tab through a mirrored section going right to left: the
 * source link in the copy, then the credit under the photo beside it. It is the
 * right trade. Reordering the DOM would fix the focus path and break the two
 * things that matter more — the stacking order on a phone, where the picture
 * would arrive before the story it illustrates, and the same for anyone reading
 * the page linearly. A caption after the copy it belongs to is still a
 * meaningful sequence; a photo before its own headline is not.
 */
const WRITEUP_WITH_PHOTO_MIRRORED =
  'md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-x-7';

/** The copy block of a mirrored section: second column, same row. */
const WRITEUP_COPY_MIRRORED = 'md:col-start-2 md:row-start-1';

/**
 * Its photo column, and the same 16rem on every section that has one, including
 * the three-column line-up section further up.
 *
 * One width down the page is what makes the pictures read as a column rather
 * than as separately sized illustrations. The height is left to the photo:
 * a 4:5 portrait stands 320px here and a 3:2 landscape 213px, which is how a
 * section that is one sentence long stops carrying a picture twice the height
 * of its own copy. Which shape a photo takes is decided with the photo, in
 * `italy2026WriteUpImages.ts`.
 */
const WRITEUP_PHOTO_COLUMN =
  // `pl-4` on a phone only. Stacked, the photo sits under copy that is already
  // indented by the width of its team bar, and a picture starting 16px to the
  // left of every line above it reads as a bleed rather than as alignment.
  // Beside the copy from `md` up there is nothing to line up with, so it goes.
  //
  // No width cap below `md`: stacked, a landscape photo should run the width of
  // the copy it follows, and capping it at 16rem left it stopping a third of
  // the way short of every line above it, which reads as a thumbnail somebody
  // forgot to finish. A portrait still needs the cap — at full phone width it
  // paints 488px tall — and gets it from `WriteUpNewsPhoto`, which knows the
  // photo's own shape.
  'mt-3 pl-4 md:mt-0 md:w-48 md:pl-0 lg:w-64';

/**
 * The same column in a section that carries no team bar.
 *
 * The `pl-4` above exists to line a stacked photo up with copy that a 3px bar
 * has already pushed 16px right. Where there is no bar there is nothing to line
 * up with, and the indent reads as a picture nudged out of the column for no
 * reason.
 */
const WRITEUP_PHOTO_COLUMN_FLUSH = 'mt-3 md:mt-0 md:w-48 lg:w-64';

/** The photo column of a mirrored section: first column, same row. */
const WRITEUP_PHOTO_COLUMN_MIRRORED = `${WRITEUP_PHOTO_COLUMN} md:col-start-1 md:row-start-1`;

/** And the same without the phone indent, for a section with no team bar. */
const WRITEUP_PHOTO_COLUMN_MIRRORED_FLUSH = `${WRITEUP_PHOTO_COLUMN_FLUSH} md:col-start-1 md:row-start-1`;

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
      const [race, weather, news, championship, practice] = await Promise.all([
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
        context.queryClient.ensureQueryData(
          routeQuery(api.practiceResults.getPracticeResultsForRaceSlug, {
            raceSlug: RACE_SLUG,
          }),
        ),
      ]);
      if (!race) {
        throw notFound();
      }
      return { race, weather, weatherNow, news, championship, practice };
    },
    head: ({ loaderData }) => {
      const race = loaderData?.race;
      const title = '2026 Italian Grand Prix Predictions & Picks';
      const description =
        race?.status === 'finished'
          ? '2026 Italian Grand Prix predictions scored against the official Monza classification. See who called the top 5 for qualifying and the race.'
          : race?.status === 'cancelled'
            ? 'The 2026 Italian Grand Prix was called off.'
            : '2026 Italian Grand Prix predictions at Monza. Pick a top 5 for qualifying and the race, with the form, tyre choice and driver news that decide a Monza result.';
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
  const { race, weather, weatherNow, news, championship, practice } =
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
              primaryActionTargetId={
                isLive ? RACE_WRITEUP_PICKS_ANCHOR : undefined
              }
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
            weather={isLive ? weather : null}
            now={weatherNow}
          />
        </div>

        {/* Directly under the hero, whose schedule card now carries the
            forecast: the hazard is a threshold that forecast crossed, and
            leaving it below the track map and the compound strip had a reader
            meeting the consequence long after the numbers that caused it. Its
            own gate stays open on a finished page, where it simply leads. */}
        <HeatHazard showPickRead={isLive} />
        {/* Then what changed this week, and the seats it moved straight after
            the feed item that reports it. */}
        {isLive ? (
          <>
            <WeekendNewsSection items={news.items} />
            <MonzaSeats byCode={driversByCode} />
            <WeekendPracticeSection results={practice} raceSlug={RACE_SLUG} />
          </>
        ) : null}
        <WatchTable />
        <TrackMap />
        <TyreChoice />
        {/* The standings carry a right-hand card, the tribute and the contracts
            do not, so the prose-only asides follow rather than interleave. */}
        {isLive ? (
          <>
            <RaceWriteupChampionshipContext
              championship={championship}
              venueName="Monza"
              sourceUrl={F1_STANDINGS_SOURCE}
            />
            <McLarenForm />
            <FerrariTribute />
            <SafetyCarLivery />
            <NorrisContract />
            <ColapintoContract />
          </>
        ) : null}

        <RaceFaqSection faqs={FAQS} />

        {isLive ? (
          <DeferredRaceWriteupPicks
            phase={phase}
            raceId={race._id}
            round={race.round}
            season={race.season}
            raceSlug={RACE_SLUG}
            venueName="Monza"
          />
        ) : (
          <RaceWriteupClosingPanel
            phase={phase}
            raceSlug={RACE_SLUG}
            venueName="Monza"
          />
        )}

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Race facts and schedule:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
            Driver line-up:{' '}
            <ExternalSource href={HADJAR_AUTOSPORT_SOURCE}>
              Autosport
            </ExternalSource>
            .
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
  return (
    <RaceSignalsSection
      heading="What matters at Monza"
      stats={[
        ['5.793', 'km circuit'],
        ['53', 'race laps'],
        ['80%', 'full throttle'],
        ['1.2', 'km main straight'],
      ]}
      signals={[
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
      ]}
    >
      <p className="gpp-reading-copy mt-3 text-text-muted">
        A speed-trap result can be inflated by a tow, so clean laps, braking and
        long runs are what separate the cars here.
      </p>
    </RaceSignalsSection>
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
        {/* Geography, so it belongs with the map rather than in the news feed:
            it is the braking point of all three chicanes and it holds for the
            season. The Turn 5 change is the half a reader can act on. Gravel
            ended a lap that ran wide there; asphalt hands the time back and
            leaves track limits to do the punishing. */}
        <p className="gpp-reading-copy mt-3 text-text-muted">
          The kerbs at Turns 1, 4 and 8 have been rebuilt for 2026, and the
          gravel on the exit of Roggia is now asphalt run-off.{' '}
          <ExternalSource href={PIRELLI_MONZA_SOURCE}>
            Read Pirelli&rsquo;s Monza preview
          </ExternalSource>
          .
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
          {/* The one line the deleted "Before you lock your Top 5" section
              carried that nothing else on the page did: what the geography
              above means for the order of a pick. It belongs here, beside the
              corner it is about, rather than in a list of method steps that
              restated the tow, the long runs and the practice sessions the
              sections above had already covered. */}
          <p className="gpp-reading-copy mt-3 text-text-muted">
            Rettifilo compresses the field into one heavy stop on lap one, so a
            driver at the back of your Top 5 carries more opening-lap risk here
            than at most circuits.
          </p>
          {/* The drawn lap and the real thing, in one column. The map is the
              taller element by a long way, so this side ended a third of the
              way down it and left the rest of the column empty; a photograph of
              the kerbs the map draws as lines is the one picture that belongs
              next to it. Landscape, unlike every other photo on the page: a
              portrait here would stand taller than the map it is explaining. */}
          <WriteUpNewsPhoto {...MONZA_TRACKSIDE_WRITEUP_IMAGE} />
        </div>
      </div>
    </section>
  );
}

/**
 * The seats, and nothing but the seats.
 *
 * Three paragraphs opened this section, and every sentence of them was already
 * on the page: `raceNews` carries the injury, the two seats it moves and the
 * FP1 rookie run, as items the feed directly above already reports. News that
 * moves a pick belongs in the feed, where it retires itself when the weekend
 * ends, rather than hand-typed into prose that does not. What the feed cannot
 * do is show the affected seats at once, in team colour, which is what the
 * card is for and the only reason the section stayed.
 *
 * No team bar left either. The bar marks a block of copy as one team's story;
 * with the copy gone the card carries the colour itself, in the 3px bar of
 * each badge, which is the same mechanism doing the same job one level down.
 */
function MonzaSeats({ byCode }: { byCode: Map<string, StandingsDriver> }) {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="monza-seats">
      <h2
        id="monza-seats"
        className="font-title text-2xl font-medium text-text"
      >
        Who takes Hadjar&rsquo;s seat
      </h2>
      {/* The same two columns every other photo section on this page uses, so
          the portrait lands in the one 16rem rail the eye is already following
          down the page. Stacked in a narrow 18rem card it left the right half
          of a 64rem page blank, which read as a section that had lost its
          copy \u2014 because it had. */}
      <div className={`mt-7 ${WRITEUP_WITH_PHOTO}`}>
        {/* Three across from `sm`, not three rows. Each row is a label, a
            badge and four words; stacked they are a list the eye reads
            downwards, side by side they are the comparison the section is
            actually making \u2014 one seat empty, one filled, one untouched \u2014 and
            they fill the column rather than trailing off half way. */}
        <dl className="grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-3">
          {/* Team colour is the one thing a list of three names cannot say:
              without it a reader is left working out that two of these seats
              are Red Bull's and one is Racing Bulls'. */}
          {[
            { label: 'Out at Monza', code: 'HAD', note: 'Left-wrist injury' },
            { label: 'Red Bull', code: 'LAW', note: 'In Hadjar\u2019s seat' },
            { label: 'Racing Bulls', code: 'TSU', note: 'Unchanged' },
          ].map(({ label, code, note }) => {
            const driver = byCode.get(code);
            return (
              <div
                key={label}
                className="bg-surface-elevated px-4 py-4 sm:px-5 sm:py-5"
              >
                <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
                  {label}
                </dt>
                <dd className="mt-3 text-sm text-text">
                  {driver ? (
                    <span className="flex flex-wrap items-center gap-2">
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
                    </span>
                  ) : null}
                  {note ? (
                    <span
                      className={
                        driver ? 'mt-2 block text-text-muted' : undefined
                      }
                    >
                      {note}
                    </span>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className={WRITEUP_PHOTO_COLUMN_FLUSH}>
          <WriteUpNewsPhoto {...HADJAR_WRITEUP_IMAGE} />
        </div>
      </div>
    </section>
  );
}

type Championship = FunctionReturnType<
  typeof api.f1Standings.getF1Championship
>;
type StandingsDriver = Championship['drivers'][number];

function McLarenForm() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="mclaren-form">
      <div className={WRITEUP_WITH_PHOTO_MIRRORED}>
        <div
          className={`gpp-team-bar pl-4 md:max-w-3xl ${WRITEUP_COPY_MIRRORED}`}
          style={
            {
              '--team-colour': TEAM_COLORS.McLaren ?? FALLBACK_TEAM_COLOR,
            } as CSSProperties
          }
        >
          <h2
            id="mclaren-form"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            Monza is a different test for McLaren
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            McLaren won in Hungary and Zandvoort, both high-downforce races.
            Andrea Stella says the MCL40 has been weaker on drag and braking.
            Monza tests both, and Friday is where it shows in Norris and
            Piastri&rsquo;s straight-line speed.{' '}
            <ExternalSource href={MCLAREN_FORM_SOURCE}>
              Read Stella&rsquo;s assessment
            </ExternalSource>
            .
          </p>
          <p className="gpp-reading-copy mt-3 text-text-muted">
            McLaren will run its H-Wing, a rotating rear wing, on both cars at
            Monza. It tested a revised version in Hungary FP1 and has brought it
            back with a new low-drag rear wing. McLaren will also test smaller
            low-drag options before choosing its qualifying setup.{' '}
            <ExternalSource href={MCLAREN_H_WING_MOTORSPORT_SOURCE}>
              Motorsport.com
            </ExternalSource>
            .{' '}
            <ExternalSource href={MCLAREN_H_WING_RN365_SOURCE}>
              RacingNews365
            </ExternalSource>
            .
          </p>
        </div>
        <div className={WRITEUP_PHOTO_COLUMN_MIRRORED}>
          <WriteUpNewsPhoto {...MCLAREN_PAIR_WRITEUP_IMAGE} />
        </div>
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
function TyreChoice() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="tyre-choice">
      <div className={WRITEUP_WITH_PHOTO_MIRRORED}>
        <div className={`md:max-w-3xl ${WRITEUP_COPY_MIRRORED}`}>
          <h2
            id="tyre-choice"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            Monza gets the three softest tyres
          </h2>

          <TyreCompoundScale venue="Monza" hardest="C3" />

          <p className="gpp-reading-copy mt-7 text-text-muted">
            Tyres wear most in fast corners. Monza has few of those, so the C5
            can last longer here than it usually does.
          </p>
          <p className="gpp-reading-copy mt-3 text-text-muted">
            A stop at Monza costs more time than at almost any other race, so
            teams will try to one-stop. Heat is the usual reason that fails.
            Pirelli expects the rears to overheat out of the chicanes rather
            than wear out, which keeps a one-stop on.
          </p>
          {/* "Friday long runs will settle it" opened this paragraph and was
              the fourth time the page sent the reader to Friday: the hero, the
              signal table's long-run row and the heat section's FP2 read all
              say it, and the heat section says which session and why. What is
              left here is the part only this section can say, which is what
              each strategy does to a Top 5. */}
          <p className="gpp-reading-copy mt-3 text-text-muted">
            A one-stop puts the weight on qualifying and track position. A
            second stop favours the drivers who look after their tyres over the
            ones who are only quick over a single lap.{' '}
            <ExternalSource href={TYRE_SOURCE}>
              Read Pirelli&rsquo;s selection
            </ExternalSource>
            .
          </p>
        </div>
        <div className={WRITEUP_PHOTO_COLUMN_MIRRORED_FLUSH}>
          <WriteUpNewsPhoto {...PIRELLI_COMPOUND_WRITEUP_IMAGE} />
        </div>
      </div>
    </section>
  );
}

/**
 * The heat hazard, as a write-up section rather than as `raceNews`.
 *
 * It is declared for the meeting, so it lands on all twenty-two cars at once
 * and `affectsSessions` would be answering for the whole grid. It carries no
 * team bar for the same reason: it belongs to nobody on the grid.
 *
 * What it deliberately does not do is repeat the forecast. The schedule card
 * in the hero above serves live numbers that move, and a hand-typed 36°C
 * beside a component saying 33°C is the page arguing with itself. The threshold
 * and the regulation are what the component cannot say, so they are what is
 * here.
 *
 * Outside the `isLive` block, unlike the liveries and the seat news. Those stop
 * mattering the moment the race starts; a heat hazard is half the explanation
 * of the result, so a reader arriving at the finished page to work out why a
 * one-stop turned into two still needs it. That decides the tense: the
 * declaration is stated as something that happened, and the regulation as what
 * a heat hazard does, so neither sentence needs revisiting on Sunday night.
 *
 * `showPickRead` is the one part that does expire. "Read FP2" is advice for
 * somebody still choosing, and it is worse than useless once the grid has
 * formed, so it is the only paragraph the phase gates.
 */
function HeatHazard({ showPickRead }: { showPickRead: boolean }) {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="heat-hazard">
      <div className={WRITEUP_WITH_PHOTO}>
        <div className="md:max-w-3xl">
          <h2
            id="heat-hazard"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            The FIA has declared a heat hazard
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            The official forecast put the heat index above 31°C for the race,
            which is the threshold in Article B1.5.10. It is the first heat
            hazard since Austria in June.
          </p>
          <p className="gpp-reading-copy mt-3 text-text-muted">
            A heat hazard makes the driver cooling system mandatory and raises
            the minimum weight by 5kg to cover the kit and its battery. Wearing
            the vest is still the driver&rsquo;s choice, and anyone who leaves
            it off carries 0.5kg of ballast instead.{' '}
            <ExternalSource href={HEAT_HAZARD_SOURCE}>
              Read the race director&rsquo;s notice
            </ExternalSource>
            .
          </p>
          {showPickRead ? (
            <p className="gpp-reading-copy mt-3 text-text-muted">
              FP2 runs closest to Sunday&rsquo;s track temperature, so it is the
              session that shows who is managing the rears.
            </p>
          ) : null}
        </div>
        <div className={WRITEUP_PHOTO_COLUMN_FLUSH}>
          <WriteUpNewsPhoto {...MONZA_HEAT_WRITEUP_IMAGE} />
        </div>
      </div>
    </section>
  );
}

/*
 * The safety car livery, on the same gate as the Ferrari tribute below.
 *
 * It changes no pick, so `raceNews` would reject it, and it earns a paragraph
 * here for the same reason the tribute does: a reader who sees a repainted car
 * lead the field on Sunday should already know why. No team bar, because the
 * safety car is not a team's.
 *
 * The manufacturer is deliberately unnamed. Mercedes is the sole 2026 supplier
 * and the livery is on the F1 safety car, but no source says both in one
 * sentence, and joining two of them is how a page invents a fact.
 *
 * No photo either. Every picture of this livery is F1's or Disney's, and the
 * freely licensed safety cars on Commons are older cars in the standard
 * colours: a photo of the thing this section says has been repainted.
 */
function SafetyCarLivery() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="safety-car-livery">
      <div className="max-w-3xl">
        <h2
          id="safety-car-livery"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          The safety car runs in Lightning McQueen colours
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Formula 1 and Disney have put a Cars livery on the safety car for
          Monza, twenty years after the film. A full-size Lightning McQueen,
          badged as a Formula 1 track vehicle, laps the circuit over the
          weekend. It is the same safety car at the same speeds, so a deployment
          costs the field what it always does.{' '}
          <ExternalSource href={SAFETY_CAR_SOURCE}>
            Read the Monza report
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
      <div className={WRITEUP_WITH_PHOTO}>
        <div
          className="gpp-team-bar pl-4 md:max-w-3xl"
          style={
            {
              '--team-colour': TEAM_COLORS.Ferrari ?? FALLBACK_TEAM_COLOR,
            } as CSSProperties
          }
        >
          <h2
            id="ferrari-tribute"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            Ferrari runs a Schumacher tribute
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            Ferrari has revealed a one-off SF-26 livery for Monza, thirty years
            after Schumacher&rsquo;s first season in red. The car is extra red,
            with the white gone from the engine cover, retro driver numbers,
            Schumacher&rsquo;s signature on the cover, gold on the BBS rims, and
            his seven stars on the nose. Barrichello and Vettel will take the
            F2002 around on Saturday and Sunday.
          </p>
          <p className="gpp-reading-copy mt-3 text-text-muted">
            Hamilton and Leclerc&rsquo;s race suits are out: red with white
            stripes, and seven stars on the back for Schumacher&rsquo;s titles.{' '}
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
        <div className={WRITEUP_PHOTO_COLUMN}>
          <WriteUpNewsPhoto {...SCHUMACHER_TRIBUTE_WRITEUP_IMAGE} />
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
      <div className={WRITEUP_WITH_PHOTO_MIRRORED}>
        <div
          className={`gpp-team-bar pl-4 md:max-w-3xl ${WRITEUP_COPY_MIRRORED}`}
          style={
            {
              '--team-colour': TEAM_COLORS.McLaren ?? FALLBACK_TEAM_COLOR,
            } as CSSProperties
          }
        >
          <h2
            id="norris-contract"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            Norris re-signs with McLaren to 2030
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            McLaren has confirmed a new deal keeping Lando Norris at the team
            until at least the end of 2030, with a multi-year option beyond
            that. He joined as a test and development driver in 2017 and has
            raced for them since 2019. Oscar Piastri is contracted to the end of
            2028.{' '}
            <ExternalSource href={NORRIS_CONTRACT_SOURCE}>
              Read the announcement
            </ExternalSource>
            .
          </p>
        </div>
        <div className={WRITEUP_PHOTO_COLUMN_MIRRORED}>
          <WriteUpNewsPhoto {...NORRIS_WRITEUP_IMAGE} />
        </div>
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
      <div className={WRITEUP_WITH_PHOTO}>
        <div
          className="gpp-team-bar pl-4 md:max-w-3xl"
          style={
            {
              '--team-colour': TEAM_COLORS.Alpine ?? FALLBACK_TEAM_COLOR,
            } as CSSProperties
          }
        >
          <h2
            id="colapinto-contract"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
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
        <div className={WRITEUP_PHOTO_COLUMN}>
          <WriteUpNewsPhoto {...COLAPINTO_WRITEUP_IMAGE} />
        </div>
      </div>
    </section>
  );
}
