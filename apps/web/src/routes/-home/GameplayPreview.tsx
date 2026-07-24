import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, GripVertical, Swords, Trophy } from 'lucide-react';

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
          <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-racing-red uppercase">
            Try before you sign up
          </p>
          <h2 className="font-title text-3xl leading-tight font-bold text-text sm:text-4xl">
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
          className="relative overflow-hidden rounded-md border border-border bg-surface/90 p-4 shadow-2xl shadow-black/25 sm:p-5"
          aria-label="Example prediction card"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
                Example picks
              </p>
              <p className="mt-1 font-semibold text-text">
                Race · Top five prediction
              </p>
            </div>
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
              17 pts
            </span>
          </div>

          <ol className="space-y-2">
            {EXAMPLE_PICKS.map((pick, index) => (
              <li
                key={pick.code}
                className="flex items-center gap-3 rounded-sm border border-border/75 bg-page/65 px-3 py-2.5"
              >
                <GripVertical
                  className="h-4 w-4 shrink-0 text-text-muted/55"
                  aria-hidden="true"
                />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-text tabular-nums">
                  {index + 1}
                </span>
                <span
                  className="h-6 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: pick.teamColor }}
                  aria-hidden="true"
                />
                <span className="font-title text-sm font-bold tracking-wide text-text">
                  {pick.code}
                </span>
                <span className="ml-auto text-xs font-semibold text-accent">
                  {index < 2 ? '5 pts' : index < 4 ? '3 pts' : '1 pt'}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-4 rounded-sm border border-border/75 bg-page/65 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Swords className="h-4 w-4 text-racing-red" aria-hidden="true" />
              <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                Teammate battle
              </p>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="font-title rounded-sm border border-accent/45 bg-accent/10 px-3 py-2 text-center text-sm font-bold text-accent">
                HAM
              </span>
              <span className="text-[10px] font-bold text-text-muted">VS</span>
              <span className="font-title rounded-sm border border-border bg-surface-muted/45 px-3 py-2 text-center text-sm font-bold text-text-muted">
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
