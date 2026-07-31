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
        'Learn how to play Grand Prix Picks. See the Top 5 and teammate Head-to-Head scoring rules, session deadlines, and leaderboard formats.',
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
    example: 'You pick NOR for P1 and NOR finishes P1.',
  },
  {
    points: 3,
    title: 'One position away',
    description:
      'Your driver finishes one place above or below your prediction.',
    example: 'You pick LEC for P3 and LEC finishes P2 or P4.',
  },
  {
    points: 1,
    title: 'In the actual Top 5',
    description:
      'Your driver finishes in the Top 5 but is at least two places away.',
    example: 'You pick PIA for P1 and PIA finishes P4.',
  },
  {
    points: 0,
    title: 'No scoring match',
    description:
      'Your driver is outside the Top 5 and is not one position away.',
    example: 'You pick RUS for P2 and RUS finishes P7.',
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
                <Link to="/races">Choose a race</Link>
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
                  title: 'Call teammate battles',
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
                Main game
              </p>
              <h2
                id="top-five-heading"
                className="font-title text-2xl font-semibold text-text"
              >
                Top 5 scoring
              </h2>
              <p className="gpp-reading-copy mt-2 max-w-3xl text-text-muted">
                Each of your five drivers scores independently. Order matters,
                and a perfect Top 5 earns 25 points in a session.
              </p>
            </div>

            <div className="mt-7 border-y border-border">
              <div className="grid grid-cols-[4.5rem_1fr] px-1 py-3 text-xs font-semibold tracking-label text-text-muted uppercase sm:grid-cols-[5rem_1.2fr_1fr] sm:px-4">
                <span>Points</span>
                <span>Result</span>
                <span className="hidden sm:block">Example</span>
              </div>
              {scoringRows.map((row) => (
                <div
                  key={row.points}
                  className="grid grid-cols-[4.5rem_1fr] border-t border-border px-1 py-5 sm:grid-cols-[5rem_1.2fr_1fr] sm:px-4"
                >
                  <span
                    className={`gpp-mono text-lg font-semibold ${
                      row.points > 0 ? 'text-accent' : 'text-text-muted'
                    }`}
                  >
                    {row.points}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-text">
                      {row.title}
                    </h3>
                    <p className="mt-0.5 text-base leading-6 text-text-muted">
                      {row.description}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-text-muted sm:hidden">
                      {row.example}
                    </p>
                  </div>
                  <p className="hidden pl-4 text-base leading-6 text-text-muted sm:block">
                    {row.example}
                  </p>
                </div>
              ))}
            </div>

            <p className="gpp-reading-copy mt-5 max-w-3xl border-l-2 border-accent pl-4 text-text-muted">
              <strong className="text-text">One-position detail:</strong> the
              3-point rule also applies just outside the Top 5. If you predict a
              driver in P5 and they finish P6, that pick earns 3 points.
            </p>
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
                  Teammate Head-to-Head
                </h2>
                <p className="gpp-reading-copy mt-2 max-w-2xl text-text-muted">
                  After saving your Top 5, choose which driver from each
                  teammate pairing will finish ahead. Every correct matchup
                  earns 1 point. An incorrect or unscorable matchup earns 0.
                </p>
              </div>
              <div className="border-t border-border pt-6 sm:border-t-0 sm:border-l sm:py-2 sm:pl-10">
                <p className="font-title gpp-mono text-6xl leading-none font-semibold text-accent">
                  1
                </p>
                <p className="mt-2 text-xs font-semibold tracking-label text-text-muted uppercase">
                  point per correct pick
                </p>
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
                Compare total scores for a race weekend or the full season,
                then view everyone or only players you follow.
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
