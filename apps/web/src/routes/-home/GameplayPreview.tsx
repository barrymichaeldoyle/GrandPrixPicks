import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Swords, Trophy } from 'lucide-react';
import type { CSSProperties } from 'react';

import { Button } from '@/components/Button/Button';

const EXAMPLE_PICKS = [
  { code: 'NOR', teamColor: '#ff8700' },
  { code: 'VER', teamColor: '#3671c6' },
  { code: 'LEC', teamColor: '#e8002d' },
  { code: 'PIA', teamColor: '#ff8700' },
  { code: 'RUS', teamColor: '#27f4d2' },
] as const;

export function GameplayPreview({ raceSlug }: { raceSlug: string | null }) {
  return (
    <section className="px-3 py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div className="max-w-lg">
          <p className="gpp-label mb-3 text-xs">Try before you sign up</p>
          <h2 className="font-title text-3xl leading-tight font-semibold text-text sm:text-4xl">
            Make your call before lights out
          </h2>
          <p className="mt-4 text-base leading-7 text-text-muted">
            Rank your top five, pick the teammate battles, and see exactly what
            you&apos;re playing for. You don&apos;t need an account to start.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-text-muted">
            <li className="flex items-center gap-2">
              <Check
                className="h-4 w-4 shrink-0 text-accent"
                aria-hidden="true"
              />
              Separate picks for qualifying, sprints, and races
            </li>
            <li className="flex items-center gap-2">
              <Check
                className="h-4 w-4 shrink-0 text-accent"
                aria-hidden="true"
              />
              Up to 25 points from every top-five session
            </li>
            <li className="flex items-center gap-2">
              <Check
                className="h-4 w-4 shrink-0 text-accent"
                aria-hidden="true"
              />
              Sign in only when you&apos;re ready to save
            </li>
          </ul>
          {raceSlug ? (
            <Button asChild className="mt-6" size="md" rightIcon={ArrowRight}>
              <Link
                to="/races/$raceSlug"
                params={{ raceSlug }}
                search={{ from: 'home' }}
              >
                Try the picker
              </Link>
            </Button>
          ) : (
            <Button asChild className="mt-6" size="md" rightIcon={ArrowRight}>
              <Link to="/races">Explore races</Link>
            </Button>
          )}
        </div>

        <div
          className="relative overflow-hidden rounded-lg border border-border bg-surface p-4 sm:p-5"
          aria-label="Example prediction card"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="gpp-label">Example picks</p>
              <p className="mt-1 font-medium text-text">
                Race · Top five prediction
              </p>
            </div>
            {/* A points total is data: mono, tabular, 2px radius. */}
            <span className="gpp-mono rounded-sm border border-border bg-surface-elevated px-2.5 py-1 text-sm text-text">
              17 pts
            </span>
          </div>

          <ol className="space-y-1">
            {EXAMPLE_PICKS.map((pick, index) => {
              // The scoring bands, in their fixed colours: exact is violet,
              // off-by-one green, in-the-top-five amber.
              const points = index < 2 ? 5 : index < 4 ? 3 : 1;
              const pointsClass =
                points === 5
                  ? 'text-result-perfect'
                  : points === 3
                    ? 'text-result-beat'
                    : 'text-result-close';

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
                  <span className="gpp-mono text-sm text-text">
                    {pick.code}
                  </span>
                  <span className={`gpp-mono ml-auto text-sm ${pointsClass}`}>
                    {points === 1 ? '1 pt' : `${points} pts`}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 rounded-sm border border-border/75 bg-page/65 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Swords className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
                Teammate battle
              </p>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="font-title flex items-center justify-center gap-1.5 rounded-sm border border-accent/45 bg-accent/10 px-3 py-2 text-center text-sm font-semibold text-accent">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                HAM
              </span>
              <span className="text-xs font-semibold text-text-muted">VS</span>
              <span className="font-title rounded-sm border border-border bg-surface-muted/45 px-3 py-2 text-center text-sm font-semibold text-text-muted">
                LEC
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
            <Trophy className="h-4 w-4 text-racing-amber" aria-hidden="true" />
            Score every session. Climb the season leaderboard.
          </div>
        </div>
      </div>
    </section>
  );
}
