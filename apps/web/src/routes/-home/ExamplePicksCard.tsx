import { Check, Swords } from 'lucide-react';
import type { CSSProperties } from 'react';

/**
 * A worked example of a scored session: five slots and a teammate battle.
 *
 * This is the page's best explanation of the game — five scored rows and one
 * H2H call say more in a glance than the headline and a three-step strip
 * combined. It used to sit two screens down inside `GameplayPreview`, where a
 * visitor met the primary CTA long before anything showed them what a pick
 * was. It now renders in the hero instead.
 *
 * Deliberately the real five-slot game including the teammate battle: a
 * cut-down three-slot demo would fit the hero more easily but would teach a
 * game that does not exist, and would drop H2H entirely.
 */

const EXAMPLE_PICKS = [
  { code: 'NOR', teamColor: '#f47600' },
  { code: 'VER', teamColor: '#4781d7' },
  { code: 'LEC', teamColor: '#ed1131' },
  { code: 'PIA', teamColor: '#f47600' },
  { code: 'RUS', teamColor: '#00d7b6' },
] as const;

/** Points per slot in this example, matching the bands in lib/scoring.ts. */
const EXAMPLE_POINTS = [5, 5, 3, 3, 1] as const;

const TOTAL = EXAMPLE_POINTS.reduce((sum, n) => sum + n, 0);

function pointsClass(points: number): string {
  if (points === 5) {
    return 'text-result-exact';
  }
  if (points === 3) {
    return 'text-result-near';
  }
  return 'text-result-top5';
}

export function ExamplePicksCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border bg-surface p-4 sm:p-5 ${className}`}
      aria-label="Example of a scored prediction"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="gpp-label">Example · Race result</p>
          <p className="mt-1 font-medium text-text">How a top five scores</p>
        </div>
        {/* A points total is data: mono, tabular, 2px radius. */}
        <span className="gpp-mono rounded-sm border border-border bg-surface-elevated px-2.5 py-1 text-sm text-text">
          {TOTAL} pts
        </span>
      </div>

      <ol className="space-y-1">
        {EXAMPLE_PICKS.map((pick, index) => {
          const points = EXAMPLE_POINTS[index];
          return (
            <li
              key={pick.code}
              // Team colour lives in the 3px left bar and nowhere else.
              className="gpp-team-bar flex h-9 items-center gap-3 rounded-sm border border-border bg-page pr-3 pl-4"
              style={{ '--team-colour': pick.teamColor } as CSSProperties}
            >
              <span className="gpp-mono w-4 shrink-0 text-xs text-text-muted">
                {index + 1}
              </span>
              <span className="gpp-mono text-sm text-text">{pick.code}</span>
              <span
                className={`gpp-mono ml-auto text-sm ${pointsClass(points)}`}
              >
                {points === 1 ? '1 pt' : `${points} pts`}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-sm border border-border bg-page p-3">
        <div className="mb-2 flex items-center gap-2">
          <Swords className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <p className="gpp-label">Teammate battle · 1 pt each</p>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="flex items-center justify-center gap-1.5 rounded-sm border border-accent-hairline bg-accent-quiet px-3 py-2 text-center text-sm font-medium text-accent">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            HAM
          </span>
          <span className="gpp-label">vs</span>
          <span className="rounded-sm border border-border bg-surface-elevated px-3 py-2 text-center text-sm text-text-muted">
            LEC
          </span>
        </div>
        <p className="mt-2.5 text-xs leading-5 text-text-muted">
          Call the winner in all 11 teams, every session.
        </p>
      </div>
    </div>
  );
}
