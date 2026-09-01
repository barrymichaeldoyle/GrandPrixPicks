import { v } from 'convex/values';

/** Optional photo shown on race write-up pages only, not in the feed. */
export const raceNewsWriteUpImageValidator = v.object({
  src: v.string(),
  alt: v.string(),
  width: v.number(),
  height: v.number(),
  creditName: v.string(),
  creditUrl: v.string(),
  licenseName: v.string(),
  licenseUrl: v.string(),
  modificationNote: v.optional(v.string()),
});

export type RaceNewsWriteUpImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  creditName: string;
  creditUrl: string;
  licenseName: string;
  licenseUrl: string;
  modificationNote?: string;
};

/** True when every stored write-up image field matches the expected record. */
export function writeUpImageFieldsMatch(
  existing: RaceNewsWriteUpImage | undefined,
  expected: RaceNewsWriteUpImage,
): boolean {
  if (!existing) {
    return false;
  }

  return (
    existing.src === expected.src &&
    existing.alt === expected.alt &&
    existing.width === expected.width &&
    existing.height === expected.height &&
    existing.creditName === expected.creditName &&
    existing.creditUrl === expected.creditUrl &&
    existing.licenseName === expected.licenseName &&
    existing.licenseUrl === expected.licenseUrl &&
    existing.modificationNote === expected.modificationNote
  );
}

/** Lukas Raich, CC BY-SA 4.0. Austria 2026; used on the Monza Browning FP1 card. */
export const BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE: RaceNewsWriteUpImage = {
  src: '/media/lukas-raich-williams-browning-austria-2026-1920.jpg',
  alt: 'Luke Browning in the Williams FW48 at the 2026 Austrian Grand Prix',
  width: 1920,
  height: 960,
  creditName: 'Lukas Raich',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._46_Browning_(1).jpg',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  modificationNote: 'resized',
};
