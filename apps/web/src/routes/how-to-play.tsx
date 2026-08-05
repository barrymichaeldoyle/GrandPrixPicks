import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Check,
  Flag,
  LockKeyhole,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { PageHeader } from '@/components/PageHeader';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';

export const Route = createFileRoute('/how-to-play')({
  component: HowToPlayPage,
  head: () => {
    const meta = pageMeta({
      title: 'How to Play | F1 Prediction Game Rules | Grand Prix Picks',
      description:
        'Learn how to play Grand Prix Picks. See the Top 5 and team-mate Head-to-Head scoring rules, session deadlines, and leaderboard formats.',
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
    driver: 'Lando Norris',
    code: 'NOR',
    flag: 'gb',
    pick: 'P1',
    result: 'P1',
    toneClass: 'text-result-exact',
    // Background strip, not `border-b` — thick bottom borders miter into the
    // 1px side borders and nick each end of the sector rule.
    ruleClass: 'bg-result-exact',
    teamColor: 'var(--team-mclaren)',
  },
  {
    points: 3,
    title: 'One position away',
    description:
      'Your driver finishes one place above or below your prediction.',
    driver: 'Charles Leclerc',
    code: 'LEC',
    flag: 'mc',
    pick: 'P3',
    result: 'P2 / P4',
    toneClass: 'text-result-near',
    ruleClass: 'bg-result-near',
    teamColor: 'var(--team-ferrari)',
  },
  {
    points: 1,
    title: 'In the actual Top 5',
    description:
      'Your driver finishes in the Top 5 but is at least two places away.',
    driver: 'Oscar Piastri',
    code: 'PIA',
    flag: 'au',
    pick: 'P1',
    result: 'P4',
    toneClass: 'text-result-top5',
    ruleClass: 'bg-result-top5',
    teamColor: 'var(--team-mclaren)',
  },
  {
    points: 0,
    title: 'No scoring match',
    description:
      'Your driver is outside the Top 5 and is not one position away.',
    driver: 'George Russell',
    code: 'RUS',
    flag: 'gb',
    pick: 'P2',
    result: 'P7',
    toneClass: 'text-result-miss',
    ruleClass: 'bg-result-miss',
    teamColor: 'var(--team-mercedes)',
  },
] as const;

const sessionRows = [
  {
    weekend: 'Regular weekend',
    sessions: ['Qualifying', 'Race'],
  },
  {
    weekend: 'Sprint weekend',
    sessions: ['Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'],
  },
] as const;

function HowToPlayPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          eyebrow="Game guide"
          title="How to Play"
          subtitle="Pick the drivers you think will finish ahead, score points in every session, and climb the leaderboard."
          actions={
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm" rightIcon={ArrowRight}>
                <Link to="/races">Make your picks</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link to="/leaderboard">View leaderboard</Link>
              </Button>
            </div>
          }
        />

        <div className="relative pb-8 sm:pl-8">
          <div
            aria-hidden
            className="absolute top-12 bottom-32 left-0 hidden w-px bg-border sm:block"
          />

          <section
            aria-labelledby="quick-start-heading"
            className="pb-10 sm:pb-14"
          >
            <h2
              id="quick-start-heading"
              className="font-title text-2xl font-semibold text-text"
            >
              The quick version
            </h2>
            <ol className="mt-7 grid gap-7 sm:grid-cols-3 sm:gap-0">
              {[
                {
                  title: 'Rank your Top 5',
                  copy: 'Choose five unique drivers in the order you expect them to finish.',
                },
                {
                  title: 'Call team-mate battles',
                  copy: 'Pick which driver will finish ahead in each Head-to-Head matchup.',
                },
                {
                  title: 'Score and climb',
                  copy: 'Earn points after official results are published and compare your rank.',
                },
              ].map((step, index) => (
                <li
                  key={step.title}
                  className="relative sm:border-l sm:border-border sm:px-6 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0"
                >
                  <span className="font-title gpp-mono text-4xl leading-none font-semibold text-accent/45">
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 font-semibold text-text">{step.title}</h3>
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
            <div className="max-w-3xl">
              <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
                Sessions
              </p>
              <h2
                id="sessions-heading"
                className="font-title text-2xl font-semibold text-text"
              >
                Every session is its own game
              </h2>
              <p className="gpp-reading-copy mt-2 text-text-muted">
                Make a separate Top 5 and Head-to-Head prediction for each
                supported session. Practice sessions do not count.
              </p>
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-0">
              {sessionRows.map((row, index) => (
                <div
                  key={row.weekend}
                  className={
                    index === 0
                      ? 'sm:pr-10'
                      : 'border-t border-border pt-8 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-10'
                  }
                >
                  <h3 className="font-title text-lg font-semibold text-text">
                    {row.weekend}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {row.sessions.map((session) => (
                      <li
                        key={session}
                        className="flex items-center gap-2 text-base text-text-muted"
                      >
                        <Check
                          className="h-4 w-4 shrink-0 text-success"
                          aria-hidden
                        />
                        {session}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="top-five-heading"
            className="border-t border-border py-10 sm:py-14"
          >
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
                Top 5 scoring
              </p>
              <h2
                id="top-five-heading"
                className="font-title text-2xl font-semibold text-text"
              >
                Close still counts.
              </h2>
              <p className="gpp-reading-copy mt-2 max-w-3xl text-text-muted">
                Your prediction does not need to be perfect to score. Each of
                your five picks is judged on its own, and a perfect Top 5 earns
                25 points.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {scoringRows.slice(0, 3).map((row) => (
                <article
                  key={row.points}
                  className="flex min-h-[22rem] flex-col border border-b-0 border-border bg-surface"
                >
                  <div className="flex flex-1 flex-col p-5">
                    <div className={`flex items-end gap-2 ${row.toneClass}`}>
                      <span className="gpp-mono text-5xl leading-none font-semibold">
                        {row.points}
                      </span>
                      <span className="pb-1 text-xs font-semibold tracking-label uppercase">
                        {row.points === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-text">
                      {row.title}
                    </h3>
                    <p className="mt-1.5 text-base leading-6 text-text-muted">
                      {row.description}
                    </p>

                    <div className="mt-auto pt-6">
                      <p className="gpp-mono text-[0.65rem] font-semibold tracking-label text-text-muted uppercase">
                        Example
                      </p>
                      <div className="mt-2 border border-border bg-page">
                        <div
                          className="flex items-center gap-2 border-l-4 px-3 py-3"
                          style={{ borderLeftColor: row.teamColor }}
                        >
                          <img
                            src={`/flags/${row.flag}.svg`}
                            alt=""
                            className="h-4 w-6 object-cover"
                          />
                          <span className="min-w-0 truncate text-sm font-semibold text-text">
                            {row.driver}
                          </span>
                          <span className="gpp-mono ml-auto text-xs text-text-muted">
                            {row.code}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-t border-border px-3 py-3">
                          <div>
                            <span className="block text-[0.65rem] font-semibold tracking-label text-text-muted uppercase">
                              Your pick
                            </span>
                            <span
                              className={`gpp-mono mt-1 block text-xl font-semibold ${row.toneClass}`}
                            >
                              {row.pick}
                            </span>
                          </div>
                          <ArrowRight
                            className="mx-2 h-4 w-4 text-text-disabled"
                            aria-hidden
                          />
                          <div className="text-right">
                            <span className="block text-[0.65rem] font-semibold tracking-label text-text-muted uppercase">
                              Actual result
                            </span>
                            <span
                              className={`gpp-mono mt-1 block text-xl font-semibold ${row.toneClass}`}
                            >
                              {row.result}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`h-2 shrink-0 ${row.ruleClass}`}
                    aria-hidden="true"
                  />
                </article>
              ))}
            </div>

            <article className="mt-4 flex flex-col border border-b-0 border-border bg-surface">
              <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex gap-4 sm:items-center">
                  <span
                    className={`gpp-mono text-4xl leading-none font-semibold ${scoringRows[3].toneClass}`}
                  >
                    0
                  </span>
                  <div>
                    <h3 className="font-semibold text-text">
                      {scoringRows[3].title}
                    </h3>
                    <p className="mt-1 text-base text-text-muted">
                      {scoringRows[3].description}
                    </p>
                  </div>
                </div>
                <div className="gpp-mono flex items-center gap-3 text-sm text-text-muted sm:justify-end">
                  <span>{scoringRows[3].code}</span>
                  <strong className={scoringRows[3].toneClass}>
                    {scoringRows[3].pick}
                  </strong>
                  <ArrowRight
                    className="h-4 w-4 text-text-disabled"
                    aria-hidden
                  />
                  <strong className={scoringRows[3].toneClass}>
                    {scoringRows[3].result}
                  </strong>
                </div>
              </div>
              <div
                className={`h-1 shrink-0 ${scoringRows[3].ruleClass}`}
                aria-hidden="true"
              />
            </article>

            <div className="mt-4 flex flex-col border border-b-0 border-border bg-surface">
              <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="gpp-reading-copy text-text-muted">
                  <strong className="text-text">Still close:</strong> the
                  3-point rule also applies just outside the Top 5. Predict P5
                  and finish P6, and the pick still scores.
                </p>
                <p className="gpp-mono flex items-center gap-3 text-lg font-semibold text-result-near">
                  P5
                  <ArrowRight className="h-4 w-4" aria-hidden />
                  P6
                  <span className="text-xs tracking-label uppercase">
                    3 points
                  </span>
                </p>
              </div>
              <div className="h-1 shrink-0 bg-result-near" aria-hidden="true" />
            </div>
          </section>

          <section
            aria-labelledby="h2h-heading"
            className="border-t border-border py-10 sm:py-14"
          >
            <div className="grid gap-8 sm:grid-cols-[1fr_13rem] sm:items-center">
              <div>
                <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
                  Bonus game
                </p>
                <h2
                  id="h2h-heading"
                  className="font-title text-xl font-semibold text-text"
                >
                  Team-mate Head-to-Head
                </h2>
                <p className="gpp-reading-copy mt-2 max-w-2xl text-text-muted">
                  After saving your Top 5, choose which driver from each
                  team-mate pairing will finish ahead. Every correct matchup
                  earns 1 point. An incorrect or unscorable matchup earns 0.
                </p>
              </div>
              <div className="flex flex-col border border-b-0 border-border bg-surface">
                <div className="p-6">
                  <p className="font-title gpp-mono text-6xl leading-none font-semibold text-result-near">
                    1
                  </p>
                  <p className="mt-2 text-xs font-semibold tracking-label text-text-muted uppercase">
                    point per correct pick
                  </p>
                </div>
                <div
                  className="h-1 shrink-0 bg-result-near"
                  aria-hidden="true"
                />
              </div>
            </div>
          </section>

          <div className="grid border-y border-border md:grid-cols-3">
            <section
              aria-labelledby="deadlines-heading"
              className="py-7 md:pr-7"
            >
              <LockKeyhole className="mb-3 h-6 w-6 text-accent" aria-hidden />
              <h2
                id="deadlines-heading"
                className="font-title text-lg font-semibold text-text"
              >
                Deadlines
              </h2>
              <p className="gpp-reading-copy mt-3 text-text-muted">
                Each session locks at its scheduled start time. You can revise
                saved picks until then.
              </p>
            </section>

            <section
              aria-labelledby="privacy-heading"
              className="border-t border-border py-7 md:border-t-0 md:border-l md:px-7"
            >
              <ShieldCheck className="mb-3 h-6 w-6 text-accent" aria-hidden />
              <h2
                id="privacy-heading"
                className="font-title text-lg font-semibold text-text"
              >
                Pick privacy
              </h2>
              <p className="gpp-reading-copy mt-3 text-text-muted">
                Your saved picks remain visible to you. Other players&apos;
                picks stay hidden until the session locks.
              </p>
            </section>

            <section
              aria-labelledby="leaderboards-heading"
              className="border-t border-border py-7 md:border-t-0 md:border-l md:pl-7"
            >
              <Trophy className="mb-3 h-6 w-6 text-accent" aria-hidden />
              <h2
                id="leaderboards-heading"
                className="font-title text-lg font-semibold text-text"
              >
                Leaderboards
              </h2>
              <p className="gpp-reading-copy mt-3 text-text-muted">
                Compare total scores for a race weekend or the full season, then
                view everyone or only players you follow.
              </p>
              <Link
                to="/leaderboard"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
              >
                Explore the leaderboard
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </section>
          </div>

          <section
            aria-labelledby="questions-heading"
            className="py-10 sm:py-14"
          >
            <h2
              id="questions-heading"
              className="font-title text-2xl font-semibold text-text"
            >
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
                <dt className="font-semibold text-text">
                  Do I need an account?
                </dt>
                <dd className="gpp-reading-copy text-text-muted">
                  Yes. A free account is required to save your picks, earn
                  points, and appear on the leaderboard. You can try the picker
                  before signing up.
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
                <dt className="font-semibold text-text">
                  What about penalties?
                </dt>
                <dd className="gpp-reading-copy text-text-muted">
                  We score the official FIA classification. Grid penalties do
                  not change the qualifying classification, so your qualifying
                  picks are unaffected; post-race penalties do change the race
                  classification, so those sessions are rescored.{' '}
                  <Link
                    to="/results-policy"
                    className="font-medium text-accent hover:underline"
                  >
                    Read the results policy
                  </Link>
                  .
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-accent/25 bg-accent-muted/20 p-6 text-center sm:p-8">
            <Flag className="mx-auto mb-3 h-7 w-7 text-accent" aria-hidden />
            <h2 className="font-title text-2xl font-semibold text-text">
              Ready to make your picks?
            </h2>
            <p className="gpp-reading-copy mx-auto mt-2 max-w-xl text-text-muted">
              Choose the current race weekend, rank your Top 5, and save before
              the next session starts.
            </p>
            <Button asChild size="md" rightIcon={ArrowRight} className="mt-5">
              <Link to="/races">View race weekends</Link>
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
