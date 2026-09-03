import type { WriteUpNewsPhotoProps } from '@/components/WriteUpNewsPhoto';

/**
 * The Madrid write-up's one photograph.
 *
 * There is nothing to photograph at the Madring yet: it has held a Formula 3
 * test and no Grand Prix, and Wikimedia carries the circuit's logo and two
 * layout diagrams but no usable picture of the place. So the one section on
 * the page with a subject that can be photographed is the one about 1981, and
 * the picture is Jarama.
 *
 * Landscape, following the rule the Monza set established: a circuit, not a
 * person. The `context` line is load-bearing here rather than decorative. The
 * section is about a race in 1981 and the photo is from 2010, so without a
 * date on it a reader would take the grandstand, the timing board and the
 * modern signage for how it looked when Formula 1 last raced there.
 */
export const JARAMA_WRITEUP_IMAGE = {
  src: '/media/carlos-delgado-jarama-pit-straight-2010-900.webp',
  srcSet:
    '/media/carlos-delgado-jarama-pit-straight-2010-450.webp 450w, /media/carlos-delgado-jarama-pit-straight-2010-900.webp 900w',
  sizes: '(min-width: 1024px) 18rem, 100vw',
  width: 900,
  height: 600,
  alt: 'The pit straight at the Jarama circuit near Madrid, with the control tower and an empty concrete grandstand behind it',
  context: 'Jarama, 2010',
  creditName: 'Carlos Delgado',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:Tribuna_recta_Circuito_del_Jarama.jpg',
  licenseName: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  modificationNote: 'cropped and resized',
} as const satisfies WriteUpNewsPhotoProps;
