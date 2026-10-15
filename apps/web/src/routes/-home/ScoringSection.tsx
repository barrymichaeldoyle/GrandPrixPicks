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

// Illustrative finishing order, not a past or forecast race classification.
const scoringExample = [
  {
    driver: 'Norris',
    predicted: 1,
    actual: 1,
    points: 5,
    result: 'Exact position',
    color: 'text-result-exact',
  },
  {
    driver: 'Leclerc',
    predicted: 2,
    actual: 3,
    points: 3,
    result: 'One position away',
    color: 'text-result-near',
  },
  {
    driver: 'Verstappen',
    predicted: 3,
    actual: 5,
    points: 1,
    result: 'In the actual Top 5',
    color: 'text-result-top5',
  },
  {
    driver: 'Piastri',
    predicted: 4,
    actual: 2,
    points: 1,
    result: 'In the actual Top 5',
    color: 'text-result-top5',
  },
  {
    driver: 'Russell',
    predicted: 5,
    actual: 8,
    points: 0,
    result: 'Outside the scoring positions',
    color: 'text-text-muted',
  },
] as const;

/** Result-colour rules beside a worked example, stacked on smaller screens. */
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

        <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <dl className="grid content-start gap-x-8 gap-y-5 sm:grid-cols-3 lg:grid-cols-1">
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

          <div className="max-w-2xl">
            <table className="w-full text-left text-sm">
              <caption className="pb-3 text-left font-medium text-text">
                Example Top 5 score
                <span className="mt-1 block text-sm font-normal text-text-muted">
                  Illustrative results
                </span>
              </caption>
              <thead className="border-y border-border text-xs text-text-muted">
                <tr>
                  <th scope="col" className="py-3 pr-2 font-medium">
                    Driver
                  </th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">
                    Your pick
                  </th>
                  <th scope="col" className="px-2 py-3 text-right font-medium">
                    Finish
                  </th>
                  <th scope="col" className="py-3 pl-2 text-right font-medium">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scoringExample.map((row) => (
                  <tr key={row.driver}>
                    <th scope="row" className="py-3 pr-2 font-medium text-text">
                      {row.driver}
                    </th>
                    <td className="gpp-mono px-2 py-3 text-right text-text-muted">
                      P{row.predicted}
                    </td>
                    <td className="gpp-mono px-2 py-3 text-right text-text">
                      P{row.actual}
                    </td>
                    <td
                      className={`gpp-mono py-3 pl-2 text-right ${row.color}`}
                    >
                      {row.points}
                      <span className="sr-only">
                        {' '}
                        {row.points === 1 ? 'point' : 'points'} · {row.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border-strong">
                <tr>
                  <th
                    scope="row"
                    colSpan={3}
                    className="py-3 font-medium text-text"
                  >
                    Top 5 total
                  </th>
                  <td className="gpp-mono py-3 pl-2 text-right font-semibold text-text">
                    11<span className="sr-only"> points</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

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
