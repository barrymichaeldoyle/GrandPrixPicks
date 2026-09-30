import type { RaceNewsWriteUpImage } from './raceNewsWriteUpImage';

/** The news card's column: half the section from `sm` up, full width below. */
const NEWS_CARD_SIZES = '(min-width: 640px) 28rem, 100vw';

const CC_BY_SA_4 = {
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const;

/** 3:2, the shape of the Sepang photos already on this page. */
const LANDSCAPE = { sizes: NEWS_CARD_SIZES, width: 900, height: 600 } as const;

/** 2:1, Lukas Raich's side-on Austria frames, as the Browning card uses. */
const WIDE = { sizes: NEWS_CARD_SIZES, width: 900, height: 450 } as const;

function srcSet(name: string) {
  return {
    src: `/media/${name}-900.webp`,
    srcSet: `/media/${name}-450.webp 450w, /media/${name}-900.webp 900w`,
  };
}

/**
 * Photos for the Bahrain (Sepang) write-up's news cards, by news key.
 *
 * Only the cards a photo tells the truth about. The livery card has none on
 * purpose: every Mercedes on Commons is in the livery the story says is being
 * replaced. The schedule, first-timers and Straight Mode cards are about
 * timetables and rules, which no photo shows.
 *
 * Every one of these was taken somewhere other than Sepang 2026, so every one
 * carries `context`.
 */
export const BAHRAIN_2026_NEWS_IMAGES: Record<string, RaceNewsWriteUpImage> = {
  'bahrain-gp-moves-to-sepang': {
    ...LANDSCAPE,
    ...CC_BY_SA_4,
    ...srcSet('morio-grandstand-tower-sepang-2016'),
    alt: 'The leaf-shaped roof of the Sepang International Circuit grandstand tower, seen from below at the 2016 Malaysian Grand Prix',
    context: 'Sepang, 2016',
    creditName: 'Morio',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Sepang_International_Circuit_Grandstand_Tower_2016_Malaysian_GP.jpg',
    modificationNote: 'resized',
  },
  'sepang-weather-forecast': {
    ...LANDSCAPE,
    ...srcSet('morio-suspended-grid-sepang-2012'),
    alt: 'Cars and team crews stopped on a wet Sepang pit straight under grey skies while the 2012 Malaysian Grand Prix was suspended for rain',
    context: 'Sepang, 2012',
    creditName: 'Morio',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Suspended_starting_grid_2012_Malaysia.jpg',
    licenseName: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    modificationNote: 'resized',
  },
  'colapinto-sepang-grid-penalty': {
    ...LANDSCAPE,
    ...CC_BY_SA_4,
    ...srcSet('yu-chu-chin-colapinto-alpine-melbourne-2026'),
    alt: 'Franco Colapinto in an Alpine shirt, waving in the paddock at the 2026 Australian Grand Prix',
    context: 'Melbourne, 2026',
    creditName: 'Yu Chu Chin',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Franco_Colapinto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8698).jpg',
    modificationNote: 'cropped and resized',
  },
  'verstappen-engine-penalty-undecided': {
    ...WIDE,
    ...CC_BY_SA_4,
    ...srcSet('lukas-raich-verstappen-red-bull-austria-2026'),
    alt: 'Max Verstappen’s Red Bull over a kerb at the 2026 Austrian Grand Prix',
    context: 'Austria, 2026',
    creditName: 'Lukas Raich',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._3_Verstappen_(1).jpg',
    modificationNote: 'resized',
  },
  'aston-martin-alonso-stroll-2027': {
    ...WIDE,
    ...CC_BY_SA_4,
    ...srcSet('lukas-raich-alonso-aston-martin-austria-2026'),
    alt: 'Fernando Alonso’s Aston Martin over a kerb at the 2026 Austrian Grand Prix',
    context: 'Austria, 2026',
    creditName: 'Lukas Raich',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._14_Alonso_(1).jpg',
    modificationNote: 'resized',
  },
  'russell-engine-penalty-sepang-possible': {
    ...LANDSCAPE,
    ...CC_BY_SA_4,
    ...srcSet('martin-lee-russell-mercedes-suzuka-2026'),
    alt: 'George Russell’s Mercedes leaving the final chicane at Suzuka during the 2026 Japanese Grand Prix',
    context: 'Suzuka, 2026',
    creditName: 'Martin Lee',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Mercedes_W17_-_George_Russell_exits_the_final_chicane_at_Suzuka_during_the_2026_Japanese_GP_(55195432314).jpg',
    modificationNote: 'cropped and resized',
  },
  'mercedes-sepang-upgrade': {
    ...LANDSCAPE,
    ...CC_BY_SA_4,
    ...srcSet('martin-lee-antonelli-mercedes-suzuka-2026'),
    alt: 'Kimi Antonelli’s Mercedes approaching Spoon Curve at Suzuka during the 2026 Japanese Grand Prix',
    context: 'Suzuka, 2026',
    creditName: 'Martin Lee',
    creditUrl:
      'https://commons.wikimedia.org/wiki/File:Mercedes_W17_-_Kimi_Antonelli_approaches_Spoon_Curve_at_Suzuka_during_the_2026_Japanese_GP_(55194289192).jpg',
    modificationNote: 'cropped and resized',
  },
};
