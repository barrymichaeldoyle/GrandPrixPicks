import type { WriteUpNewsPhotoProps } from '@/components/WriteUpNewsPhoto';

/** Rick Dikeman, CC BY-SA 3.0. Indianapolis 2002; Monza write-up Ferrari tribute. */
export const SCHUMACHER_TRIBUTE_WRITEUP_IMAGE = {
  src: '/media/rick-dikeman-schumacher-ferrari-indianapolis-2002.jpg',
  alt: 'Michael Schumacher in Ferrari overalls, Indianapolis 2002',
  width: 900,
  height: 1350,
  creditName: 'Rick Dikeman',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Michael_Schumacher_2002.jpg',
  licenseName: 'CC BY-SA 3.0',
  licenseUrl: 'http://creativecommons.org/licenses/by-sa/3.0/',
} as const satisfies WriteUpNewsPhotoProps;
