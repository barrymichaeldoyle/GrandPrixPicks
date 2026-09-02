/**
 * Editorial weekend write-ups, by race slug.
 *
 * These are hand-written preview pages, one per weekend that earns one, and
 * they are a different thing from `/races/$raceSlug`: that page is the game
 * (picks, results, duels), this is the reading. A weekend has a write-up only
 * if somebody wrote it, so this is a lookup rather than a derived path, and the
 * absence of an entry is the normal case.
 *
 * It exists because the write-ups were orphans. Nothing in the app linked to
 * the Monza page: it was reachable only from the sitemap, which is the worst of
 * both worlds — Google is asked to index a page that the site itself never
 * points at, and the players it was written for never see it.
 *
 * Add a line here when a new write-up ships, and every surface that renders a
 * link picks it up.
 */
export type RaceWriteup = {
  /** Route path for the write-up. */
  to: string;
  /**
   * Date the hand-written page content was last substantively reviewed.
   *
   * The page uses this for its visible reviewed stamp and `dateModified`; the
   * sitemap uses the same value for `lastmod`. Automated modules carry their
   * own timestamps and do not claim that the editorial copy was reviewed.
   * Keeping the date beside the route prevents those crawler-facing signals
   * drifting.
   */
  reviewedAt: string;
  /**
   * Short link text, for places with no room to say more (the race page
   * header). Names the circuit rather than the round, because it sits next to
   * something that already says which race this is.
   */
  label: string;
  /**
   * One sentence on what this weekend's piece actually covers.
   *
   * Written from the page's own sections, not from a template, because it is
   * the only part of the callout that tells a reader whether the write-up is
   * worth their click. Revise it in the same commit that adds a section, the
   * way `reviewedAt` is revised when the prose changes.
   */
  summary: string;
  /**
   * The dashboard's line for the piece: an instruction, naming the weekend.
   *
   * It was a teaser describing the contents ("Two things to know before FP1"),
   * and a count is the wrong shape for that job twice over. It goes stale the
   * moment a third thing happens, and it describes rather than asks, so the row
   * read as a caption on a card that is in fact the only route to the write-up.
   *
   * Per weekend rather than generic because naming the circuit is what stops
   * "Read the full write-up" being a button that could sit on any page.
   */
  cta: string;
};

const RACE_WRITEUPS = {
  'italy-2026': {
    to: '/f1-2026-italian-grand-prix-predictions',
    reviewedAt: '2026-09-02',
    label: 'Monza predictions',
    summary:
      'What matters at Monza, where the overtakes happen, the tyre choice, and the driver news that moves the grid.',
    cta: 'Read the Monza predictions',
  },
  'bahrain-2026': {
    to: '/f1-2026-bahrain-grand-prix-predictions',
    reviewedAt: '2026-09-01',
    label: 'Sepang predictions',
    summary:
      'Why a Bahrain Grand Prix is running in Malaysia, what nine years without a Formula 1 race has done to the circuit, and the tyre choice that opens up strategy.',
    cta: 'Read the Sepang predictions',
  },
  'singapore-2026': {
    to: '/f1-2026-singapore-grand-prix-predictions',
    reviewedAt: '2026-09-01',
    label: 'Singapore predictions',
    summary:
      'Singapore’s first sprint weekend, the single practice session before competitive running, and what matters at Marina Bay.',
    cta: 'Read the Singapore predictions',
  },
  'azerbaijan-2026': {
    to: '/f1-2026-azerbaijan-grand-prix-predictions',
    reviewedAt: '2026-09-01',
    label: 'Baku predictions',
    summary:
      'Why Baku races on Saturday in 2026, where the lap is won and lost, and how to treat a mixed qualifying order.',
    cta: 'Read the Baku predictions',
  },
  'madrid-2026': {
    to: '/f1-2026-madrid-grand-prix-predictions',
    reviewedAt: '2026-08-31',
    label: 'Madring predictions',
    summary:
      'No form guide for a circuit nobody has raced, so the layout, the tyre choice and the championship picture do the work.',
    cta: 'Read the Madring predictions',
  },
} as const satisfies Record<string, RaceWriteup>;

export type RaceWriteupSlug = keyof typeof RACE_WRITEUPS;

/**
 * Every write-up, each carrying the race slug it belongs to.
 *
 * The slug is the registry key, so callers that need it were deriving it back
 * out of the route path. That is a second copy of the mapping, and a second
 * copy is what let `CircuitGuide` fall a whole weekend behind.
 */
export function listRaceWriteups(): readonly (RaceWriteup & {
  raceSlug: RaceWriteupSlug;
})[] {
  return Object.entries(RACE_WRITEUPS).map(([raceSlug, writeup]) => ({
    ...writeup,
    raceSlug: raceSlug as RaceWriteupSlug,
  }));
}

/**
 * The reviewed date for a known write-up route.
 *
 * Unlike the nullable UI lookup below, editorial routes pass a literal slug,
 * so a missing registry entry is a type error instead of a silent fallback to
 * another hand-written date.
 */
export function getRaceWriteupReviewedAt(raceSlug: RaceWriteupSlug): string {
  return RACE_WRITEUPS[raceSlug].reviewedAt;
}

/** The write-up for a race, or null when that weekend has none. */
export function getRaceWriteup(
  raceSlug: string | undefined,
): RaceWriteup | null {
  if (!raceSlug || !(raceSlug in RACE_WRITEUPS)) {
    return null;
  }
  return RACE_WRITEUPS[raceSlug as RaceWriteupSlug];
}
