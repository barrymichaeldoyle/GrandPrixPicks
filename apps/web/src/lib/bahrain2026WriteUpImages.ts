import type { WriteUpNewsPhotoProps } from '@/components/WriteUpNewsPhoto';

/**
 * Every photo on this page is from the 2017 Malaysian Grand Prix, the last
 * Formula 1 race at Sepang before this one. All three are Morio's, all
 * landscape 3:2, and all sit in the same 18rem margin as Madrid's and Baku's.
 */
const SEPANG_2017_WRITEUP_LANDSCAPE = {
  sizes: '(min-width: 1024px) 18rem, 100vw',
  width: 900,
  height: 600,
  modificationNote: 'resized',
} as const;

/**
 * Morio, CC BY-SA 4.0 (via Wikimedia Commons). Beside the circuit section.
 *
 * Vettel's Ferrari at Sepang in second practice, 2017: the same session the
 * lap record beside it was set in.
 */
export const SEPANG_VETTEL_WRITEUP_IMAGE = {
  ...SEPANG_2017_WRITEUP_LANDSCAPE,
  src: '/media/morio-vettel-ferrari-sepang-2017-900.webp',
  srcSet:
    '/media/morio-vettel-ferrari-sepang-2017-450.webp 450w, /media/morio-vettel-ferrari-sepang-2017-900.webp 900w',
  alt: 'Sebastian Vettel’s red Ferrari cornering at speed at Sepang during second practice for the 2017 Malaysian Grand Prix',
  context: 'Sepang, 2017',
  creditName: 'Morio',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Sebastian_Vettel_2017_Malaysia_FP2.jpg',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const satisfies WriteUpNewsPhotoProps;

/**
 * Morio, CC BY-SA 4.0 (via Wikimedia Commons). Beside "the last race here was
 * in 2017".
 *
 * The podium from that race: Hamilton, Verstappen and Ricciardo, with the
 * Petronas branding that ties the sponsor to the circuit rather than to this
 * year's race.
 */
export const SEPANG_PODIUM_WRITEUP_IMAGE = {
  ...SEPANG_2017_WRITEUP_LANDSCAPE,
  src: '/media/morio-podium-sepang-2017-900.webp',
  srcSet:
    '/media/morio-podium-sepang-2017-450.webp 450w, /media/morio-podium-sepang-2017-900.webp 900w',
  alt: 'Lewis Hamilton, Max Verstappen and Daniel Ricciardo celebrating on the podium in front of Petronas branding after the 2017 Malaysian Grand Prix',
  context: 'Sepang, 2017',
  creditName: 'Morio',
  creditUrl: 'https://commons.wikimedia.org/wiki/File:Podium_2017_Malaysia.jpg',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const satisfies WriteUpNewsPhotoProps;

/**
 * Morio, CC BY-SA 4.0 (via Wikimedia Commons). Beside the tyre choice.
 *
 * Verstappen and Hamilton wheel to wheel on track at Sepang in 2017, sparks
 * from the floors visible between them.
 */
export const SEPANG_OVERTAKE_WRITEUP_IMAGE = {
  ...SEPANG_2017_WRITEUP_LANDSCAPE,
  src: '/media/morio-verstappen-hamilton-sepang-2017-900.webp',
  srcSet:
    '/media/morio-verstappen-hamilton-sepang-2017-450.webp 450w, /media/morio-verstappen-hamilton-sepang-2017-900.webp 900w',
  alt: 'Max Verstappen’s Red Bull and Lewis Hamilton’s Mercedes running side by side on track at Sepang, sparks flying from both cars',
  context: 'Sepang, 2017',
  creditName: 'Morio',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Max_Verstappen_overtaking_Lewis_Hamilton_2017_Malaysia_1.jpg',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const satisfies WriteUpNewsPhotoProps;
