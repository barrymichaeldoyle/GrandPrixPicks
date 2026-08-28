/**
 * When a race write-up was last genuinely current.
 *
 * This replaces two hand-typed dates per page: a `LAST REVIEWED` line in the
 * footer and a `dateModified` in the page's schema, each maintained separately.
 * They could drift from the page and, worse, from each other, and they did:
 * both Monza dates still read 24 August after the page was edited on the 28th.
 *
 * A date a human has to remember to bump is a date that is wrong. So the pages
 * derive it instead. Most of what these pages now show is live (the forecast,
 * the weekend's news, the standings), and each of those carries its own
 * timestamp, so the freshest of them is a truthful answer to "when did this
 * page last change".
 *
 * `editorialDate` is the floor, and it is still hand-written on purpose: it is
 * the date the *prose* was last checked, which no data timestamp can know.
 * Bump it when the writing changes; the live inputs carry it the rest of the
 * time.
 */
export function lastReviewedAt(
  editorialDate: string,
  ...timestamps: (number | null | undefined)[]
): number {
  const editorial = Date.parse(`${editorialDate}T00:00:00Z`);
  const live = timestamps.filter(
    (value): value is number => typeof value === 'number' && value > 0,
  );
  return Math.max(editorial, ...live);
}

/** `2026-08-28`, for the `dateModified` in a page's structured data. */
export function reviewedIsoDate(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** `28 AUG 2026`, for the footer line. */
export function reviewedStamp(at: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(at))
    .toUpperCase();
}
