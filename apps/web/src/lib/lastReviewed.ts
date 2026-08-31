/**
 * When a race write-up was last genuinely current.
 *
 * This replaces two hand-typed dates per page: a `LAST REVIEWED` line in the
 * footer and a `dateModified` in the page's schema, each maintained separately.
 * They could drift from the page and, worse, from each other, and they did:
 * both Monza dates still read 24 August after the page was edited on the 28th.
 *
 * Race write-ups keep the editorial date in their shared registry so the
 * visible stamp, structured data and sitemap cannot drift. Live forecast and
 * news modules carry their own timestamps; they do not claim that the prose
 * was reviewed again.
 *
 * The optional timestamps remain useful for non-editorial surfaces that need
 * the latest meaningful input. Race write-ups intentionally call this with the
 * editorial date alone.
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
