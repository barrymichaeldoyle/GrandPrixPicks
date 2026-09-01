import { v } from 'convex/values';

/** Optional photo shown on race write-up pages only, not in the feed. */
export const raceNewsWriteUpImageValidator = v.object({
  src: v.string(),
  /** Width-descriptor set, as the track map uses. Omitted for a single file. */
  srcSet: v.optional(v.string()),
  sizes: v.optional(v.string()),
  alt: v.string(),
  width: v.number(),
  height: v.number(),
  /**
   * Where and when the photo was taken, when that is not the race the page is
   * about. Without it a sighted reader sees a car at a circuit that is plainly
   * not this one and has only the alt text, which they never read, to tell
   * them otherwise.
   */
  context: v.optional(v.string()),
  creditName: v.string(),
  creditUrl: v.string(),
  licenseName: v.string(),
  licenseUrl: v.string(),
  modificationNote: v.optional(v.string()),
});

export type RaceNewsWriteUpImage = {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width: number;
  height: number;
  context?: string;
  creditName: string;
  creditUrl: string;
  licenseName: string;
  licenseUrl: string;
  modificationNote?: string;
};

/**
 * Every field the comparison below covers.
 *
 * A `Record` of the key union rather than a list, so adding a field to
 * `RaceNewsWriteUpImage` is a typecheck failure here instead of a field the
 * idempotence guard silently stops noticing: a migration that skips its patch
 * because the fields it happens to compare are equal ships nothing and reports
 * `unchanged`.
 */
const WRITE_UP_IMAGE_FIELDS: Record<keyof RaceNewsWriteUpImage, true> = {
  src: true,
  srcSet: true,
  sizes: true,
  alt: true,
  width: true,
  height: true,
  context: true,
  creditName: true,
  creditUrl: true,
  licenseName: true,
  licenseUrl: true,
  modificationNote: true,
};

/** True when every stored write-up image field matches the expected record. */
export function writeUpImageFieldsMatch(
  existing: RaceNewsWriteUpImage | undefined,
  expected: RaceNewsWriteUpImage,
): boolean {
  if (!existing) {
    return false;
  }

  const fields = Object.keys(
    WRITE_UP_IMAGE_FIELDS,
  ) as (keyof RaceNewsWriteUpImage)[];
  return fields.every((field) => existing[field] === expected[field]);
}

/** Lukas Raich, CC BY-SA 4.0. Austria 2026; used on the Monza Browning FP1 card. */
export const BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE: RaceNewsWriteUpImage = {
  src: '/media/lukas-raich-williams-browning-austria-2026-1600.webp',
  srcSet:
    '/media/lukas-raich-williams-browning-austria-2026-800.webp 800w, /media/lukas-raich-williams-browning-austria-2026-1600.webp 1600w',
  sizes: '(min-width: 640px) 28rem, 100vw',
  alt: 'Luke Browning in the Williams FW48 at the 2026 Austrian Grand Prix',
  width: 1600,
  height: 800,
  context: 'Austria, 2026',
  creditName: 'Lukas Raich',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._46_Browning_(1).jpg',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  modificationNote: 'resized',
};
