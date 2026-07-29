import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/Button/Button';

/**
 * What the points actually are.
 *
 * Replaces the old three-step "how it works" strip, which restated what the
 * worked example above already showed and never gave a single number. The
 * scoring bands are the one thing a visitor cannot infer from looking at the
 * game, and they are what makes it feel winnable.
 *
 * Values mirror `scoreTopFive()` in apps/backend/convex/lib/scoring.ts. If the
 * engine changes, this copy is wrong — it is deliberately concrete rather than
 * vague for exactly that reason.
 */

const BANDS = [
  {
    points: '5',
    unit: 'pts',
    tone: 'text-result-exact',
    edge: 'border-result-exact/40',
    title: 'Exact position',
    body: 'You put the driver in the slot they finished in.',
  },
  {
    points: '3',
    unit: 'pts',
    tone: 'text-result-near',
    edge: 'border-result-near/40',
    title: 'Off by one place',
    body: 'Counts even when the driver finishes just outside the top five.',
  },
  {
    points: '1',
    unit: 'pt',
    tone: 'text-result-top5',
    edge: 'border-result-top5/40',
    title: 'In the top five',
    body: 'Right driver, wrong slot by two places or more.',
  },
  {
    points: '1',
    unit: 'pt',
    tone: 'text-result-near',
    edge: 'border-result-near/40',
    title: 'Teammate battle',
    body: 'For each of the 11 teams, call which driver finishes ahead.',
  },
] as const;

export function ScoringExplainer({ raceSlug }: { raceSlug: string | null }) {
  return (
    <section className="px-3 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <p className="gpp-label">How scoring works</p>
        <h2 className="mt-3 text-2xl leading-snug font-light tracking-tight text-text sm:text-3xl">
          Five slots, four outcomes, every session
        </h2>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BANDS.map((band) => (
            <div
              key={band.title}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <span
                className={`gpp-mono inline-flex items-baseline gap-1 rounded-sm border bg-page px-2 py-1 ${band.edge} ${band.tone}`}
              >
                <span className="text-lg leading-none">{band.points}</span>
                <span className="text-xs">{band.unit}</span>
              </span>
              <p className="mt-4 text-sm font-medium text-text">{band.title}</p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {band.body}
              </p>
            </div>
          ))}
        </div>

        {/* The mid-page ask. Anyone convinced by the example in the hero
            previously had to scroll six sections to find something to click. */}
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4 border-t border-border pt-6">
          {/* 5 slots x 5 pts = 25 a session. A sprint weekend runs four
              sessions (sprint quali, sprint, quali, race), a normal one two. */}
          <p className="max-w-[52ch] text-sm leading-6 text-text-muted">
            Every session scores separately, up to{' '}
            <span className="gpp-mono text-text">25</span> points a session. A
            sprint weekend runs four of them, so it is worth up to{' '}
            <span className="gpp-mono text-text">100</span> from your top fives
            alone.
          </p>
          <div className="ml-auto">
            <Button
              asChild
              variant="secondary"
              size="sm"
              rightIcon={ArrowRight}
            >
              {raceSlug ? (
                <Link
                  to="/races/$raceSlug"
                  params={{ raceSlug }}
                  search={{ from: 'home' }}
                >
                  Start picking
                </Link>
              ) : (
                <Link to="/races">Start picking</Link>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
