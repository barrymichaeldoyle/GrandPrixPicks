import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import type { CSSProperties } from 'react';

import { ScoringBands } from '@/components/ScoringBands';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { TEAM_COLORS } from '@/lib/teamColors';

// Illustrative finishing order, not a past or forecast race classification.
const scoringExample = [
  {
    driver: 'Norris',
    team: 'McLaren',
    predicted: 1,
    actual: 1,
    points: 5,
    result: 'Exact position',
    color: 'bg-result-exact',
  },
  {
    driver: 'Leclerc',
    team: 'Ferrari',
    predicted: 2,
    actual: 3,
    points: 3,
    result: 'One position away',
    color: 'bg-result-near',
  },
  {
    driver: 'Verstappen',
    team: 'Red Bull Racing',
    predicted: 3,
    actual: 5,
    points: 1,
    result: 'In the actual Top 5',
    color: 'bg-result-top5',
  },
  {
    driver: 'Piastri',
    team: 'McLaren',
    predicted: 4,
    actual: 2,
    points: 1,
    result: 'In the actual Top 5',
    color: 'bg-result-top5',
  },
  {
    driver: 'Russell',
    team: 'Mercedes',
    predicted: 5,
    actual: 8,
    points: 0,
    result: 'Outside the scoring positions',
    color: 'bg-result-miss',
  },
] as const;

/** Result-colour rules beside a worked example, stacked on smaller screens. */
export function ScoringSection() {
  return (
    <section
      aria-labelledby="landing-scoring-heading"
      className="border-t border-border px-4 py-12 sm:py-16"
    >
      <div className="mx-auto w-full max-w-(--page-max)">
        <h2 id="landing-scoring-heading" className="gpp-display-h2 text-text">
          How scoring works
        </h2>
        <p className="gpp-reading-copy-lg mt-3 max-w-3xl text-text-muted">
          Each of your five picks is scored against where that driver actually
          finished.
        </p>

        <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ScoringBands variant="field" />

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
                    <th
                      scope="row"
                      className="gpp-team-bar py-3 pr-2 pl-3 font-medium text-text"
                      style={
                        {
                          '--team-colour': TEAM_COLORS[row.team],
                        } as CSSProperties
                      }
                    >
                      {row.driver}
                    </th>
                    <td className="gpp-mono px-2 py-3 text-right text-text-muted">
                      P{row.predicted}
                    </td>
                    <td className="gpp-mono px-2 py-3 text-right text-text">
                      P{row.actual}
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <span
                        className={`gpp-mono inline-flex h-7 min-w-7 items-center justify-center px-1.5 font-semibold text-text-on-accent ${row.color}`}
                      >
                        {row.points}
                      </span>
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

        {/* Kept for the guides' sake: the home page is the strongest page
            linking to them. It was a headed, ruled block of three accent
            links, which read as a section of its own with nothing in it. */}
        <nav aria-label="F1 prediction guides" className="mt-5">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link
                to="/f1-standings"
                className="text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
              >
                2026 F1 standings
              </Link>
            </li>
            <li>
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: 'f1-points-system-explained' }}
                className="text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
              >
                F1 points system explained
              </Link>
            </li>
            <li>
              <Link
                to="/how-to-play"
                className="text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
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
