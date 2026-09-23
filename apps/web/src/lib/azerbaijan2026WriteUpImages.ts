import type { WriteUpNewsPhotoProps } from '@/components/WriteUpNewsPhoto';

/**
 * Every photo on this page sits in the same 18rem margin as Madrid's, and all
 * three are landscape 3:2: a grid, a car and a car with a driver on it.
 *
 * Commons has very little from Baku. There is nothing from 2020 onwards, and
 * the earlier races are mostly the President's press service. So two of these
 * are from 2016 and 2019, and the third is from another circuit altogether.
 * Each `context` line says where and when.
 */
const BAKU_WRITEUP_LANDSCAPE = {
  sizes: '(min-width: 1024px) 18rem, 100vw',
  width: 900,
  height: 600,
  modificationNote: 'cropped and resized',
} as const;

/**
 * crossland_alan, CC BY-SA 2.0 (via Flickr). Beside the circuit section.
 *
 * The start of the 2016 race, the first in Baku, when it was called the
 * European Grand Prix. The Commons file is only 800x450, so the largest file
 * here is 675 wide rather than 900: that still covers the 18rem column at 2x.
 */
export const BAKU_START_WRITEUP_IMAGE = {
  ...BAKU_WRITEUP_LANDSCAPE,
  src: '/media/crossland-alan-start-baku-2016-675.webp',
  srcSet:
    '/media/crossland-alan-start-baku-2016-450.webp 450w, /media/crossland-alan-start-baku-2016-675.webp 675w',
  width: 675,
  height: 450,
  alt: 'The grid lined up on the start/finish straight in Baku under the start lights, with city buildings behind the grandstand',
  context: 'The start in Baku, 2016',
  creditName: 'crossland_alan',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Start_backshot_Baku_2016.jpg',
  licenseName: 'CC BY-SA 2.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
} as const satisfies WriteUpNewsPhotoProps;

/**
 * Jens Van Hecke, CC BY-SA 2.0 (via Flickr). Beside the tyre choice.
 *
 * Vettel's SF90 at the 2019 race, from behind, with the Pirelli sidewalls in
 * frame. Commons files it under the 2019 Azerbaijan Grand Prix and its
 * timestamp is qualifying day.
 */
export const BAKU_FERRARI_WRITEUP_IMAGE = {
  ...BAKU_WRITEUP_LANDSCAPE,
  src: '/media/jens-van-hecke-vettel-ferrari-baku-2019-900.webp',
  srcSet:
    '/media/jens-van-hecke-vettel-ferrari-baku-2019-450.webp 450w, /media/jens-van-hecke-vettel-ferrari-baku-2019-900.webp 900w',
  alt: 'Sebastian Vettel’s red Ferrari seen from behind on the track in Baku, with Pirelli tyres on its rear wheels',
  context: 'Baku, 2019',
  creditName: 'Jens Van Hecke',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Ferrari_F1_(51029943032).jpg',
  licenseName: 'CC BY-SA 2.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
} as const satisfies WriteUpNewsPhotoProps;

/**
 * Liauzh, CC BY 4.0. Beside the Madrid recap.
 *
 * Commons has nothing from Madrid yet, so this is Antonelli's win in China
 * earlier in the season, by the photographer behind the Monza page's McLaren
 * picture.
 */
export const ANTONELLI_WIN_WRITEUP_IMAGE = {
  ...BAKU_WRITEUP_LANDSCAPE,
  src: '/media/liauzh-antonelli-mercedes-shanghai-2026-900.webp',
  srcSet:
    '/media/liauzh-antonelli-mercedes-shanghai-2026-450.webp 450w, /media/liauzh-antonelli-mercedes-shanghai-2026-900.webp 900w',
  alt: 'Kimi Antonelli standing on his Mercedes with a fist raised after winning the 2026 Chinese Grand Prix',
  context: 'Shanghai, 2026',
  creditName: 'Liauzh',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Mercedes_-_Kimi_Antonelli_-_Post_Race_Celebration.jpg',
  licenseName: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
} as const satisfies WriteUpNewsPhotoProps;
