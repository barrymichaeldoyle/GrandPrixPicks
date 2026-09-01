import type { WriteUpNewsPhotoProps } from '@/components/WriteUpNewsPhoto';

/** Rick Dikeman, CC BY-SA 3.0. Indianapolis 2002; Monza write-up Ferrari tribute. */
export const SCHUMACHER_TRIBUTE_WRITEUP_IMAGE = {
  src: '/media/rick-dikeman-schumacher-ferrari-indianapolis-2002-900.webp',
  srcSet:
    '/media/rick-dikeman-schumacher-ferrari-indianapolis-2002-450.webp 450w, /media/rick-dikeman-schumacher-ferrari-indianapolis-2002-900.webp 900w',
  sizes:
    '(min-width: 1024px) 18rem, (min-width: 768px) 14rem, (min-width: 640px) 20rem, 16rem',
  alt: 'Michael Schumacher in Ferrari overalls, riding a folding scooter down the Indianapolis pit lane in 2002',
  width: 900,
  height: 1350,
  context: 'Indianapolis, 2002',
  creditName: 'Rick Dikeman',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Michael_Schumacher_2002.jpg',
  licenseName: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  modificationNote: 'resized',
} as const satisfies WriteUpNewsPhotoProps;
