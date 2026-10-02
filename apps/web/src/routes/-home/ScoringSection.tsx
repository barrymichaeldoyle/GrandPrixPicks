import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { captureAnalyticsEvent } from '@/lib/analytics';

const scoringBands = [
  {
    points: 5,
    unit: 'points',
    title: 'Exact position',
    copy: 'Your driver finishes exactly where you predicted.',
    textClass: 'text-result-exact',
    ruleClass: 'border-result-exact',
  },
  {
    points: 3,
    unit: 'points',
    title: 'One position away',
    copy: 'Your driver finishes one place above or below your pick.',
    textClass: 'text-result-near',
    ruleClass: 'border-result-near',
  },
  {
    points: 1,
    unit: 'point',
    title: 'In the actual Top 5',
    copy: 'Your driver finishes in the Top 5, two or more places from your pick.',
    textClass: 'text-result-top5',
    ruleClass: 'border-result-top5',
  },
] as const;

/**
 * The three bands as one flat row, each under a rule in its result colour.
 *
 * They were three bordered cards with a 48-unit floor and an 8px colour strip,
 * which made the rules the tallest block on the landing page while almost
 * nobody acted on them (one "Full scoring rules" click in 90 days). The facts
 * are the same; the space goes to the weekend's news above.
 */
export function ScoringSection() {
  return (
    <section
      aria-labelledby="landing-scoring-heading"
      className="border-t border-border px-4 py-12 sm:py-16"
    >
      <div className="mx-auto w-full max-w-5xl">
        <h2
          id="landing-scoring-heading"
          className="text-2xl leading-tight font-light tracking-display text-text sm:text-3xl"
        >
          How scoring works
        </h2>
        <p className="gpp-reading-copy-lg mt-3 max-w-3xl text-text-muted">
          Each of your five picks is scored against where that driver actually
          finished.
        </p>

        <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-3">
          {scoringBands.map((band) => (
            <div
              key={band.points}
              className={`border-t-2 pt-3 ${band.ruleClass}`}
            >
              <dt className="flex items-baseline gap-3">
                <span
                  className={`gpp-mono text-3xl leading-none font-semibold ${band.textClass}`}
                >
                  {band.points}
                  <span className="sr-only"> {band.unit}</span>
                </span>
                <span className="font-semibold text-text">{band.title}</span>
              </dt>
              <dd className="gpp-reading-copy mt-2 text-text-muted">
                {band.copy}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-7 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="gpp-reading-copy text-text-muted">
            <strong className="text-text">Team-mate picks:</strong> each correct
            call adds 1 point to your Combined score.
          </p>
          <Link
            to="/how-to-play"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
            onClick={() =>
              captureAnalyticsEvent('landing_scoring_rules_clicked', {
                source: 'landing_scoring',
              })
            }
          >
            Full scoring rules
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <nav
          aria-label="F1 prediction resources"
          className="mt-8 border-t border-border pt-6"
        >
          <h3 className="font-title text-lg font-medium text-text">
            Form and scoring guides
          </h3>
          <ul className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <li>
              <Link
                to="/f1-standings"
                className="font-medium text-accent hover:text-accent-hover"
              >
                2026 F1 standings
              </Link>
            </li>
            <li>
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: 'f1-points-system-explained' }}
                className="font-medium text-accent hover:text-accent-hover"
              >
                F1 points system explained
              </Link>
            </li>
            <li>
              <Link
                to="/how-to-play"
                className="font-medium text-accent hover:text-accent-hover"
              >
                How to predict an F1 Top 5
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </section>
  );
}
