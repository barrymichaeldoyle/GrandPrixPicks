/**
 * The reviewed stamps for the two 2027 reference pages, apart from the data
 * they describe.
 *
 * Each page's `head` puts its stamp in `dateModified`, and `head` ships in the
 * client entry on every page. Rollup keeps a module whole in one chunk, so
 * while these lived in `lineUp2027.ts` and `calendar2027.ts` both data files
 * rode along in the entry for every visitor (~8 kB before compression).
 *
 * Bump the stamp here in the same edit as the data: it is the page's honesty
 * stamp and the sitemap's `lastmod`.
 */

/** Bumped by hand whenever the seats in `lineUp2027.ts` are re-checked against reporting. */
export const LINE_UP_2027_REVIEWED_AT = '2026-10-16';

/** For prose. Kept next to the ISO date so the two cannot drift apart. */
export const LINE_UP_2027_REVIEWED_LABEL = '16 October 2026';

/** Bumped by hand whenever the rounds in `calendar2027.ts` are re-checked against F1. */
export const CALENDAR_2027_REVIEWED_AT = '2026-10-05';

/** For prose. Kept next to the ISO date so the two cannot drift apart. */
export const CALENDAR_2027_REVIEWED_LABEL = '5 October 2026';

/** The day the FIA approved the calendar and Formula 1 published it. */
export const CALENDAR_2027_ANNOUNCED_LABEL = '16 September 2026';
