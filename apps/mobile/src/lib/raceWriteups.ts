/**
 * Dashboard write-up links, mirrored from apps/web/src/lib/raceWriteups.ts.
 *
 * Mobile opens the live page in the browser. Keep `cta` and `to` in lockstep
 * with the web registry: that file is the source of the copy.
 */
const RACE_WRITEUPS: Record<string, { to: string; cta: string }> = {
  'italy-2026': {
    to: '/f1-2026-italian-grand-prix-predictions',
    cta: 'Read the Monza results',
  },
  'bahrain-2026': {
    to: '/f1-2026-bahrain-grand-prix-predictions',
    cta: 'Read the Sepang predictions',
  },
  'singapore-2026': {
    to: '/f1-2026-singapore-grand-prix-predictions',
    cta: 'Read the Singapore predictions',
  },
  'azerbaijan-2026': {
    to: '/f1-2026-azerbaijan-grand-prix-predictions',
    cta: 'Read the Baku predictions',
  },
  'madrid-2026': {
    to: '/f1-2026-madrid-grand-prix-predictions',
    cta: 'Read the Madrid preview',
  },
};

export function getRaceWriteup(
  raceSlug: string | undefined,
): { to: string; cta: string } | null {
  if (!raceSlug || !(raceSlug in RACE_WRITEUPS)) {
    return null;
  }
  return RACE_WRITEUPS[raceSlug] ?? null;
}
