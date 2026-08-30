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
    ruleClass: 'bg-result-exact',
  },
  {
    points: 3,
    unit: 'points',
    title: 'One position away',
    copy: 'Your driver finishes one place above or below your pick.',
    textClass: 'text-result-near',
    ruleClass: 'bg-result-near',
  },
  {
    points: 1,
    unit: 'point',
    title: 'In the actual Top 5',
    copy: 'Your driver still finishes in the Top 5, but further away.',
    textClass: 'text-result-top5',
    ruleClass: 'bg-result-top5',
  },
] as const;

export function ScoringSection() {
  return (
    <section
      aria-labelledby="landing-scoring-heading"
      className="border-t border-border px-4 py-12 sm:py-16"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-3xl">
          <p className="gpp-label text-text-muted">How scoring works</p>
          <h2
            id="landing-scoring-heading"
            className="mt-2 text-2xl leading-tight font-light tracking-display text-text sm:text-3xl"
          >
            Close still counts.
          </h2>
          <p className="gpp-reading-copy-lg mt-3 text-text-muted">
            Each Top 5 pick scores on its own. A perfect five earns 25 points,
            but you do not need the exact order to get on the board.
          </p>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {scoringBands.map((band) => (
            <article
              key={band.points}
              // `min-h-48` equalises the three columns on desktop. Below `md`
              // they stack single-column, where the floor is no longer holding
              // anything level and just leaves a dead band between the copy and
              // the sector rule, so it starts at the same breakpoint as the grid.
              //
              // `border-b-0` + a filled rule strip (not `border-b-8`) keeps the
              // sector colour square-ended — CSS miters adjacent borders.
              className="flex flex-col border border-b-0 border-border bg-surface md:min-h-48"
            >
              <div className="flex flex-1 flex-col p-5">
                <div className={`flex items-end gap-2 ${band.textClass}`}>
                  <span className="gpp-mono text-4xl leading-none font-semibold">
                    {band.points}
                  </span>
                  <span className="gpp-label pb-0.5">{band.unit}</span>
                </div>
                <h3 className="mt-5 font-semibold text-text">{band.title}</h3>
                <p className="gpp-reading-copy mt-2 text-text-muted">
                  {band.copy}
                </p>
              </div>
              <div
                className={`h-2 shrink-0 ${band.ruleClass}`}
                aria-hidden="true"
              />
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-4 border border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="gpp-reading-copy text-text-muted">
            <strong className="text-text">Team-mate Head-to-Head:</strong> every
            correct call adds 1 point to your Combined score.
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
          <p className="gpp-reading-copy mt-2 max-w-3xl text-text-muted">
            Use the live championship order, the official F1 points system and a
            practical Top 5 routine before the next session locks.
          </p>
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
                to="/guides/$guideSlug"
                params={{ guideSlug: 'how-to-predict-f1-top-five' }}
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
