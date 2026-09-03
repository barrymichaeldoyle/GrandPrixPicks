import type { WriteUpNewsPhotoProps } from '@/components/WriteUpNewsPhoto';

/**
 * Every photo in a write-up margin sits in the same column. **The column width
 * is the constant; the height follows the subject.**
 *
 * The width is what makes a run of pictures read as one column rather than as
 * separate decisions, and it is the part worth holding fixed. Forcing the
 * *ratio* as well was a step too far: it cost two of these photos their
 * subject. Norris and Piastri are side by side with their hands up, and 4:5
 * cannot hold two of them — the crop cut a hand off each end. Colapinto is one
 * person, but the frame is landscape and the 4:5 cut ran down his face.
 *
 * So there are two shapes, and which one a photo takes is a question about the
 * photo and the section, not a preference:
 *
 * - `WRITEUP_PORTRAIT` (4:5) — one person, in a section with enough copy to
 *   stand beside 320px of picture. Hadjar (three paragraphs and a seat card)
 *   and the Schumacher tribute, whose whole point is the full figure on a
 *   scooter and which no landscape crop survives.
 * - `WRITEUP_LANDSCAPE` (3:2) — two people, a car, or a circuit; and any
 *   section that is a paragraph or two, where 320px of portrait left more
 *   empty column than copy. At the same width this stands 213px.
 *
 * The two `sizes` agree from `md` up, where both shapes sit in the same column
 * (`WRITEUP_PHOTO_COLUMN`: 12rem, then 16rem). They part below it, because
 * stacked on a phone the shapes are deliberately different widths: a landscape
 * runs the full width of the copy, a portrait is capped so it does not paint
 * 488px tall. Both used to claim `100vw` at every width, which asked a phone
 * for four times the pixels a capped portrait actually paints.
 */
const WRITEUP_PORTRAIT = {
  sizes:
    '(min-width: 1024px) 16rem, (min-width: 768px) 12rem, (min-width: 640px) 20rem, 16rem',
  width: 896,
  height: 1120,
  modificationNote: 'cropped and resized',
} as const;

const WRITEUP_LANDSCAPE = {
  sizes: '(min-width: 1024px) 16rem, (min-width: 768px) 12rem, 100vw',
  width: 900,
  height: 600,
  modificationNote: 'cropped and resized',
} as const;

/** Rick Dikeman, CC BY-SA 3.0. Indianapolis 2002; Monza write-up Ferrari tribute. */
export const SCHUMACHER_TRIBUTE_WRITEUP_IMAGE = {
  ...WRITEUP_PORTRAIT,
  src: '/media/rick-dikeman-schumacher-ferrari-indianapolis-2002-896.webp',
  srcSet:
    '/media/rick-dikeman-schumacher-ferrari-indianapolis-2002-448.webp 448w, /media/rick-dikeman-schumacher-ferrari-indianapolis-2002-896.webp 896w',
  alt: 'Michael Schumacher in Ferrari overalls, riding a folding scooter down the Indianapolis pit lane in 2002',
  context: 'Indianapolis, 2002',
  creditName: 'Rick Dikeman',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Michael_Schumacher_2002.jpg',
  licenseName: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
} as const satisfies WriteUpNewsPhotoProps;

/**
 * The two Melbourne photos are one photographer's set from one morning, so they
 * carry the same light and the same distance from the subject and read as a
 * pair rather than as two unrelated pictures. They take different shapes
 * because their frames and their sections differ, but the credit is shared.
 *
 * Drivers, not cars. A car photo says which team; a driver photo says who, and
 * every one of these sections is about a person: who is in a seat, who signed,
 * who is out injured. The car shot also has to be from a season old enough to
 * be public, which puts last year's livery next to this year's news.
 */
const MELBOURNE_2026_CREDIT = {
  context: 'Melbourne, 2026',
  creditName: 'Yu Chu Chin',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const;

/**
 * Yu Chu Chin, CC BY-SA 4.0. Melbourne 2026; the seat Hadjar is missing.
 *
 * The one photo that overrides the shared `sizes`, because it is the one in a
 * section whose grid is `lg:` rather than `md:`. On a tablet the other
 * portraits are already beside their copy in a 12rem column; this one is still
 * stacked and paints 20rem. Inheriting the shared hint had it asking for the
 * 448 file to fill a 320px box on a 2x screen, which is a visibly soft photo.
 */
export const HADJAR_WRITEUP_IMAGE = {
  ...WRITEUP_PORTRAIT,
  ...MELBOURNE_2026_CREDIT,
  sizes: '(min-width: 1024px) 16rem, (min-width: 640px) 20rem, 16rem',
  src: '/media/yu-chu-chin-hadjar-red-bull-melbourne-2026-896.webp',
  srcSet:
    '/media/yu-chu-chin-hadjar-red-bull-melbourne-2026-448.webp 448w, /media/yu-chu-chin-hadjar-red-bull-melbourne-2026-896.webp 896w',
  alt: 'Isack Hadjar in Red Bull team kit, walking through the paddock at the 2026 Australian Grand Prix',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Isack_Hadjar_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8755).jpg',
} as const satisfies WriteUpNewsPhotoProps;

/**
 * Yu Chu Chin, CC BY-SA 4.0. Melbourne 2026; the Colapinto contract section.
 *
 * Landscape on both counts: the source frame is landscape and he sits to one
 * side of it, so the portrait crop split his face down the right edge; and the
 * section is a single sentence, which a 320px portrait dwarfed.
 */
export const COLAPINTO_WRITEUP_IMAGE = {
  ...WRITEUP_LANDSCAPE,
  ...MELBOURNE_2026_CREDIT,
  src: '/media/yu-chu-chin-colapinto-alpine-melbourne-2026-900.webp',
  srcSet:
    '/media/yu-chu-chin-colapinto-alpine-melbourne-2026-450.webp 450w, /media/yu-chu-chin-colapinto-alpine-melbourne-2026-900.webp 900w',
  alt: 'Franco Colapinto in an Alpine shirt, waving in the paddock at the 2026 Australian Grand Prix',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Franco_Colapinto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_(028A8698).jpg',
} as const satisfies WriteUpNewsPhotoProps;

/**
 * Liauzh, CC BY 4.0. Shanghai 2026; the McLaren form section.
 *
 * Both drivers in one frame, because the section names both and asks the reader
 * to watch both on Friday. A photo of one of them would have quietly answered a
 * question the copy deliberately leaves open.
 *
 * Which is exactly why it is landscape. Two people side by side with their
 * hands up do not fit a 4:5 column: the portrait crop of this frame cut a hand
 * off each end and pushed both faces to the edges.
 */
export const MCLAREN_PAIR_WRITEUP_IMAGE = {
  ...WRITEUP_LANDSCAPE,
  src: '/media/liauzh-norris-piastri-mclaren-shanghai-2026-900.webp',
  srcSet:
    '/media/liauzh-norris-piastri-mclaren-shanghai-2026-450.webp 450w, /media/liauzh-norris-piastri-mclaren-shanghai-2026-900.webp 900w',
  alt: 'Lando Norris and Oscar Piastri in McLaren kit on the drivers’ parade at the 2026 Chinese Grand Prix',
  context: 'Shanghai, 2026',
  creditName: 'Liauzh',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Lando_Norris_%26_Oscar_Piastri.jpg',
  licenseName: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
} as const satisfies WriteUpNewsPhotoProps;

/**
 * Eustace Bagge, CC BY 4.0. Monza 2025; beside the lap map.
 *
 * The one photo on the page that is about the circuit rather than about a
 * person, and the only one that has to have been taken at Monza. It runs under
 * the overtaking copy at the width of the map's side column, where a portrait
 * would tower over the map beside it — which is why it keeps its own `sizes`
 * rather than the shared write-up column's.
 */
export const MONZA_TRACKSIDE_WRITEUP_IMAGE = {
  src: '/media/eustace-bagge-norris-mclaren-monza-2025-900.webp',
  // 1600w exists for the band below `lg`, where this stops being a 20rem side
  // column and stretches to the full width of the page. On a 768px tablet at
  // 2x that box wants ~1472px and the largest file was 900, so the one photo
  // on the page a reader might actually study was the softest thing on it.
  srcSet:
    '/media/eustace-bagge-norris-mclaren-monza-2025-450.webp 450w, /media/eustace-bagge-norris-mclaren-monza-2025-900.webp 900w, /media/eustace-bagge-norris-mclaren-monza-2025-1600.webp 1600w',
  sizes: '(min-width: 1024px) 20rem, 100vw',
  width: 900,
  height: 600,
  alt: 'A McLaren running over the green, white and red kerb on the exit of a Monza chicane in 2025',
  context: 'Monza, 2025',
  creditName: 'Eustace Bagge',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Lando_Norris_2025_Italian_Grand_Prix_qualifying.jpg',
  licenseName: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  modificationNote: 'resized',
} as const satisfies WriteUpNewsPhotoProps;
