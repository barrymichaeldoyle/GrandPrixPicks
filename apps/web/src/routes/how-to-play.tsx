import { createFileRoute, Link } from '@tanstack/react-router';

import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import type { CSSProperties } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck, Trophy } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { teamFillStyle } from '@/lib/teamColors';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';
import { PicksCallToAction } from '@/components/PicksCallToAction/PicksCallToAction';
import { useInAppView } from '@/hooks/useInAppView';

export const Route = createFileRoute('/how-to-play')({
  loader: setStaticContentCacheHeaders,
  component: HowToPlayPage,
  head: () => {
    const meta = pageMeta({
      title: 'How to Play Grand Prix Picks: F1 Prediction Game Rules',
      description:
        'Pick your top 5 for each F1 session and a winner from every team-mate pair. 5 points exact, 3 one place out, 1 in the top 5. Picks lock at session start.',
      path: '/how-to-play',
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
                '@id': `${siteConfig.url}/how-to-play#page`,
                url: `${siteConfig.url}/how-to-play`,
                name: 'How to play Grand Prix Picks',
                description:
                  'The rules of the Grand Prix Picks F1 prediction game: Top 5 scoring, Head-to-Head matchups, and session deadlines.',
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              breadcrumbSchema('/how-to-play', [
                { name: 'How to Play', path: '/how-to-play' },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

const scoringRows = [
  {
    points: 5,
    title: 'Exact position',
    description: 'Your driver finishes in the position you predicted.',
    driver: 'Norris',
    code: 'NOR',
    team: 'McLaren',
    pick: 'P1',
    result: 'P1',
    fieldClass: 'bg-result-exact',
  },
  {
    points: 3,
    title: 'One position away',
    description:
      'Your driver finishes one place above or below your prediction.',
    driver: 'Leclerc',
    code: 'LEC',
    team: 'Ferrari',
    pick: 'P3',
    result: 'P2 or P4',
    fieldClass: 'bg-result-near',
  },
  {
    points: 1,
    title: 'In the actual Top 5',
    description:
      'Your driver finishes in the Top 5 but is at least two places away.',
    driver: 'Piastri',
    code: 'PIA',
    team: 'McLaren',
    pick: 'P1',
    result: 'P4',
    fieldClass: 'bg-result-top5',
  },
  {
    points: 0,
    title: 'No scoring match',
    description:
      'Your driver is outside the Top 5 and is not one position away.',
    driver: 'Russell',
    code: 'RUS',
    team: 'Mercedes',
    pick: 'P2',
    result: 'P7',
    fieldClass: 'bg-result-miss',
  },
] as const;

const sessionRows = [
  {
    weekend: 'Regular weekend',
    sessions: ['Practice 1', 'Practice 2', 'Practice 3', 'Qualifying', 'Race'],
  },
  {
    weekend: 'Sprint weekend',
    sessions: [
      'Practice 1',
      'Sprint Qualifying',
      'Sprint',
      'Qualifying',
      'Race',
    ],
  },
] as const;

const quickSteps = [
  {
    title: 'Rank your Top 5',
    copy: 'Choose five unique drivers in the order you expect them to finish.',
  },
  {
    title: 'Make your team-mate picks',
    copy: 'Choose which driver will finish ahead in each team.',
  },
  {
    title: 'Score and climb',
    copy: 'Earn points after official results are published and compare your rank.',
  },
] as const;

/** A driver code wearing their team colour, as a picked driver does in the game. */
function TeamChip({ code, team }: { code: string; team: string }) {
  return (
    <span
      className="gpp-team-fill gpp-mono inline-flex shrink-0 items-center rounded-xs border px-1.5 py-0.5 text-xs font-semibold"
      style={teamFillStyle(team) as CSSProperties}
    >
      {code}
    </span>
  );
}

const SECTION_HEADING = 'gpp-display-h2 text-text';

/**
 * The rules page, in the display register (`docs/design-display-register.md`):
 * it is read by people deciding whether to play, so it teaches with the game's
 * own colours (scoring fields, team-colour picks) rather than describing them.
 */
function HowToPlayPage() {
  const inApp = useInAppView();
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-5xl px-4 pt-8 pb-6 sm:pt-12">
        <header className="pb-10 sm:pb-14">
          <h1 className="gpp-display gpp-display-writeup text-text">
            <span className="block">How to play</span>
            <span className="gpp-display-light mt-[0.12em] block text-text-muted">
              Grand Prix Picks
            </span>
          </h1>
          <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
            Pick the drivers you think will finish ahead, score points in every
            session, and climb the leaderboard.
          </p>
          {inApp ? null : (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="md" rightIcon={ArrowRight}>
                <Link to="/" hash="make-picks">
                  Try the F1 picker
                </Link>
              </Button>
              <Button asChild size="md" variant="secondary">
                <Link to="/leaderboard">View leaderboard</Link>
              </Button>
            </div>
          )}
        </header>

        <section
          aria-labelledby="quick-start-heading"
          className="border-t border-border py-10 sm:py-14"
        >
          <h2 id="quick-start-heading" className={SECTION_HEADING}>
            The quick version
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-0">
            {quickSteps.map((step, index) => (
              <li
                key={step.title}
                className="border-t-2 border-text pt-4 sm:border-t-2 sm:pr-6 sm:[&+li]:pl-6"
              >
                <span className="gpp-hero-digits block text-text" aria-hidden>
                  0{index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-text">
                  {step.title}
                </h3>
                <p className="gpp-reading-copy mt-1.5 text-text-muted">
                  {step.copy}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="sessions-heading"
          className="border-t border-border py-10 sm:py-14"
        >
          <h2 id="sessions-heading" className={SECTION_HEADING}>
            Every session is its own game
          </h2>
          <p className="gpp-reading-copy mt-3 max-w-3xl text-text-muted">
            Make a separate Top 5 and Head-to-Head prediction for each
            qualifying, sprint and race session. Practice sessions do not count.
          </p>

          <div className="mt-8 grid gap-8">
            {sessionRows.map((row) => (
              <div key={row.weekend}>
                <h3 className="text-sm font-semibold text-text">
                  {row.weekend}
                </h3>
                <ol className="mt-3 grid gap-1 sm:grid-cols-5">
                  {row.sessions.map((session) => {
                    const scored = !session.startsWith('Practice');
                    return (
                      <li
                        key={session}
                        className={`flex min-h-11 items-center justify-between gap-2 px-3 py-2 sm:min-h-16 sm:flex-col sm:items-start sm:py-2.5 ${
                          scored
                            ? 'bg-surface-elevated text-text'
                            : 'border border-border text-text-muted'
                        }`}
                      >
                        <span className="text-sm font-medium">{session}</span>
                        <span
                          className={`gpp-mono w-fit rounded-xs px-1.5 text-[0.6875rem] whitespace-nowrap ${
                            scored ? 'bg-text text-page' : 'text-text-muted'
                          }`}
                        >
                          {scored ? 'Picks' : 'No picks'}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="top-five-heading"
          className="border-t border-border py-10 sm:py-14"
        >
          <h2 id="top-five-heading" className={SECTION_HEADING}>
            Top 5 scoring
          </h2>
          <p className="gpp-reading-copy mt-3 max-w-3xl text-text-muted">
            Your prediction does not need to be perfect to score. Each of your
            five picks is judged on its own, up to 25 points a session.
          </p>

          {/* The four outcomes in the colours a pick wears on its result,
              each with the pick that earns it. Near-black ink clears 4.5:1 on
              all four (`ScoringBands` holds the same promise). */}
          <div className="mt-8 grid gap-1 sm:grid-cols-2">
            {scoringRows.map((row) => (
              <article
                key={row.points}
                className={`flex flex-col p-5 text-text-on-accent sm:p-6 ${row.fieldClass}`}
              >
                <div className="flex items-start gap-4">
                  <span className="gpp-hero-digits text-current">
                    {row.points}
                    <span className="sr-only">
                      {' '}
                      {row.points === 1 ? 'point' : 'points'}
                    </span>
                  </span>
                  <div className="pt-1">
                    <h3 className="text-lg leading-tight font-semibold">
                      {row.title}
                    </h3>
                    <p className="mt-1 text-sm leading-snug">
                      {row.description}
                    </p>
                  </div>
                </div>
                <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-text-on-accent/25 pt-3 text-sm">
                  <TeamChip code={row.code} team={row.team} />
                  <span className="font-semibold">{row.driver}</span>
                  <span className="gpp-mono ml-auto">
                    <span className="sr-only">Picked </span>
                    {row.pick}
                    <ArrowRight
                      className="mx-1.5 inline h-3.5 w-3.5 align-[-2px]"
                      aria-hidden
                    />
                    <span className="sr-only">, finished </span>
                    {row.result}
                  </span>
                </p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 border border-border bg-surface p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="gpp-reading-copy text-text-muted">
              <strong className="text-text">Still close:</strong> the 3-point
              rule also applies just outside the Top 5. Predict P5 and finish
              P6, and the pick still scores.
            </p>
            <p className="gpp-mono flex items-center gap-2 text-lg font-semibold text-text">
              P5
              <ArrowRight className="h-4 w-4 text-text-muted" aria-hidden />
              P6
              <span className="ml-1 rounded-xs bg-result-near px-1.5 text-xs text-text-on-accent">
                3 points
              </span>
            </p>
          </div>
        </section>

        <section
          aria-labelledby="h2h-heading"
          className="border-t border-border py-10 sm:py-14"
        >
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center">
            <div>
              <h2 id="h2h-heading" className={SECTION_HEADING}>
                Team-mate Head-to-Head
              </h2>
              <p className="gpp-reading-copy mt-3 max-w-2xl text-text-muted">
                After saving your Top 5, choose which driver from each team-mate
                pairing will finish ahead. Every correct matchup earns 1 point.
                An incorrect or unscorable matchup earns 0.
              </p>
            </div>
            {/* One duel as the picker draws it: the called driver filled in
                their team colour, the team-mate left plain. */}
            <figure>
              <div className="grid grid-cols-2 gap-1">
                <div
                  className="gpp-team-fill flex flex-col gap-1 border px-4 py-3"
                  style={teamFillStyle('McLaren') as CSSProperties}
                >
                  <span className="gpp-mono text-xs font-semibold">
                    Your pick
                  </span>
                  <span className="text-lg font-semibold">Norris</span>
                </div>
                <div className="flex flex-col gap-1 border border-border bg-surface px-4 py-3">
                  <span className="gpp-mono text-xs text-text-muted">
                    Team-mate
                  </span>
                  <span className="text-lg font-semibold text-text">
                    Piastri
                  </span>
                </div>
              </div>
              <figcaption className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                Norris finishes ahead
                <ArrowRight className="h-4 w-4" aria-hidden />
                <span className="gpp-mono rounded-xs bg-result-near px-1.5 text-xs font-semibold text-text-on-accent">
                  1 point
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <div className="grid border-y border-border md:grid-cols-3">
          <section aria-labelledby="deadlines-heading" className="py-7 md:pr-7">
            <LockKeyhole className="mb-3 h-6 w-6 text-text-muted" aria-hidden />
            <h2
              id="deadlines-heading"
              className="text-lg font-semibold text-text"
            >
              Deadlines
            </h2>
            <p className="gpp-reading-copy mt-2 text-text-muted">
              Each session locks at its scheduled start time. You can revise
              saved picks until then.
            </p>
          </section>

          <section
            aria-labelledby="privacy-heading"
            className="border-t border-border py-7 md:border-t-0 md:border-l md:px-7"
          >
            <ShieldCheck className="mb-3 h-6 w-6 text-text-muted" aria-hidden />
            <h2
              id="privacy-heading"
              className="text-lg font-semibold text-text"
            >
              Pick privacy
            </h2>
            <p className="gpp-reading-copy mt-2 text-text-muted">
              Your saved picks remain visible to you. Other players&apos; picks
              stay hidden until the session locks.
            </p>
          </section>

          <section
            aria-labelledby="leaderboards-heading"
            className="border-t border-border py-7 md:border-t-0 md:border-l md:pl-7"
          >
            <Trophy className="mb-3 h-6 w-6 text-text-muted" aria-hidden />
            <h2
              id="leaderboards-heading"
              className="text-lg font-semibold text-text"
            >
              Leaderboards
            </h2>
            <p className="gpp-reading-copy mt-2 text-text-muted">
              Compare total scores for a race weekend or the full season, then
              view everyone or only players you follow.
            </p>
            <Link
              to="/leaderboard"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-text underline decoration-border-strong underline-offset-4 hover:decoration-text"
            >
              Explore the leaderboard
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        </div>

        <section aria-labelledby="questions-heading" className="py-10 sm:py-14">
          <h2 id="questions-heading" className={SECTION_HEADING}>
            Good to know
          </h2>
          <dl className="mt-6 border-t border-border">
            <div className="grid gap-1 border-b border-border py-5 sm:grid-cols-[13rem_1fr] sm:gap-8">
              <dt className="font-semibold text-text">Is it free?</dt>
              <dd className="gpp-reading-copy text-text-muted">
                Yes. Making predictions, earning points, and competing on the
                season leaderboard or in private leagues is free.
              </dd>
            </div>
            <div className="grid gap-1 border-b border-border py-5 sm:grid-cols-[13rem_1fr] sm:gap-8">
              <dt className="font-semibold text-text">Do I need an account?</dt>
              <dd className="gpp-reading-copy text-text-muted">
                Yes. A free account is required to save your picks, earn points,
                and appear on the leaderboard. You can try the picker before
                signing up.
              </dd>
            </div>
            <div className="grid gap-1 border-b border-border py-5 sm:grid-cols-[13rem_1fr] sm:gap-8">
              <dt className="font-semibold text-text">Is H2H required?</dt>
              <dd className="gpp-reading-copy text-text-muted">
                No. Your Top 5 is still valid if you skip H2H, but correct H2H
                picks add to your Combined score.
              </dd>
            </div>
            <div className="grid gap-1 border-b border-border py-5 sm:grid-cols-[13rem_1fr] sm:gap-8">
              <dt className="font-semibold text-text">
                When are scores available?
              </dt>
              <dd className="gpp-reading-copy text-text-muted">
                Scores appear after official results for the session are
                published. Corrections are recalculated if results are later
                amended.
              </dd>
            </div>
            <div className="grid gap-1 border-b border-border py-5 sm:grid-cols-[13rem_1fr] sm:gap-8">
              <dt className="font-semibold text-text">What about penalties?</dt>
              <dd className="gpp-reading-copy text-text-muted">
                We score the official FIA classification, which is not the same
                as the starting grid. A driver who qualifies P4 and takes a
                ten-place grid penalty is still{' '}
                <strong>classified P4 for qualifying</strong>, and starts P14 on
                Sunday: your qualifying pick scores against the P4. Post-race
                penalties are the other way round, because they do change the
                race classification, so those sessions are rescored.{' '}
                <Link
                  to="/results-policy"
                  className="font-medium text-text underline decoration-border-strong underline-offset-4 hover:decoration-text"
                >
                  Read the results policy
                </Link>
                .
              </dd>
            </div>
          </dl>
        </section>

        <PicksCallToAction placement="how_to_play" />
      </div>
    </div>
  );
}
