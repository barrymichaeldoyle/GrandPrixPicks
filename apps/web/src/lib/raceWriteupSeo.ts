import type { RaceWriteupPhase } from '@/lib/raceWriteupPhase';
import { getRaceWriteup, listRaceWriteups } from '@/lib/raceWriteups';

/**
 * Hash on the homepage where the logged-in picker lives.
 *
 * Must stay aligned with {@link LANDING_PICKS_ANCHOR} in `routes/-home/LandingPicks.tsx`.
 */
export const HOME_PICKS_HASH = 'make-picks';

/** Search params that mean the race page is a deep link, not a SERP landing URL. */
export type RacePageSearch = {
  session?: string;
  share?: string;
  picks?: string;
  winners?: string;
  correct?: string;
  total?: string;
  points?: string;
  final?: string;
  by?: string;
};

const SHARE_PARAM_KEYS = [
  'picks',
  'winners',
  'correct',
  'total',
  'points',
  'final',
  'by',
] as const satisfies readonly (keyof RacePageSearch)[];

/**
 * Whether a `/races/$raceSlug` request carries session or share-card state.
 *
 * Bare race URLs compete with editorial write-ups for the same intent; deep
 * links still need the race route to render.
 */
export function isRacePageDeepLink(search: RacePageSearch): boolean {
  if (search.session !== undefined || search.share !== undefined) {
    return true;
  }
  return SHARE_PARAM_KEYS.some((key) => search[key] !== undefined);
}

/** The editorial money URL for a race, when one exists. */
export function raceWriteupMoneyPath(
  raceSlug: string | undefined,
): string | null {
  return getRaceWriteup(raceSlug)?.to ?? null;
}

/** Slugs whose `/races/$slug` page must not win against its write-up. */
export function raceSlugsWithWriteups(): readonly string[] {
  return listRaceWriteups().map((writeup) => writeup.raceSlug);
}

/**
 * Permanent redirect target for a bare race page that has a write-up.
 *
 * Returns null when the route should render (no write-up, or a deep link).
 */
export function racePageWriteupRedirectTarget(
  raceSlug: string,
  search: RacePageSearch,
): string | null {
  if (isRacePageDeepLink(search)) {
    return null;
  }
  return raceWriteupMoneyPath(raceSlug);
}

/** Head metadata for a deep-linked race page that has a write-up. */
export function racePageWriteupHeadOptions(raceSlug: string): {
  canonicalPath: string;
  noIndex: true;
} | null {
  const moneyPath = raceWriteupMoneyPath(raceSlug);
  if (!moneyPath) {
    return null;
  }
  return { canonicalPath: moneyPath, noIndex: true };
}

/** Redirect target for `/f1-predictions-this-weekend` when the round has a write-up. */
export function predictionsThisWeekendRedirectTarget(
  raceSlug: string | undefined,
): string | null {
  return raceWriteupMoneyPath(raceSlug);
}

type RaceWriteupPrimaryLink =
  | { hash: typeof HOME_PICKS_HASH; to: '/' }
  | { params: { raceSlug: string }; to: '/races/$raceSlug' };

/**
 * Where a write-up's primary CTA should send the reader.
 *
 * Pick phases use the homepage picker; results and status still use the race page.
 */
export function raceWriteupPrimaryLink(
  phase: RaceWriteupPhase,
  raceSlug: string,
): RaceWriteupPrimaryLink {
  if (phase === 'finished' || phase === 'cancelled') {
    return { to: '/races/$raceSlug', params: { raceSlug } };
  }
  return { to: '/', hash: HOME_PICKS_HASH };
}
