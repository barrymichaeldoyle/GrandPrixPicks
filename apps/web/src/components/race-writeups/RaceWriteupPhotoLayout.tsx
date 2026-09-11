import type { CSSProperties, ReactNode } from 'react';

import { RACE_WRITEUP_SECTION_HEADING } from './RaceWriteupSection';

/**
 * The write-up section that carries a photo in its margin.
 *
 * Copy on the left at the page's reading measure, picture on the right, one
 * column on a phone. The two are siblings rather than the picture living inside
 * the copy's block, because the copy's block is what carries the team bar and
 * the bar has to end where the copy ends: wrapped around both, it ran the full
 * height of the taller one, which is always the photo, and drew a 3px team
 * colour down a few hundred pixels of empty page.
 *
 * `items-start` keeps the photo at the top of the section rather than centred
 * against the copy, so the tops of the two columns agree even though their
 * bottoms do not.
 */
const WRITEUP_WITH_PHOTO =
  'md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-7';

/**
 * The same section with the picture down the left instead.
 *
 * Six of these sections run within a screen or two of each other, and every one
 * of them putting the photo in the right margin turned a page of different
 * stories into one repeated template. Alternating gives the run a rhythm and,
 * more usefully, gives each section an edge the eye can tell from the last.
 *
 * The DOM order does not change: copy first, photo second, in every section,
 * mirrored or not. That is what a screen reader and a phone both get, and both
 * want the story before the illustration. The swap is grid placement only,
 * which is why the copy and photo blocks each name their column explicitly
 * rather than relying on the order they appear in.
 *
 * The cost of that is a tab through a mirrored section going right to left: the
 * source link in the copy, then the credit under the photo beside it. It is the
 * right trade. Reordering the DOM would fix the focus path and break the two
 * things that matter more — the stacking order on a phone, where the picture
 * would arrive before the story it illustrates, and the same for anyone reading
 * the page linearly. A caption after the copy it belongs to is still a
 * meaningful sequence; a photo before its own headline is not.
 */
const WRITEUP_WITH_PHOTO_MIRRORED =
  'md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-x-7';

/** The copy block of a mirrored section: second column, same row. */
const WRITEUP_COPY_MIRRORED = 'md:col-start-2 md:row-start-1';

/**
 * Its photo column, and the same 16rem on every section that has one.
 *
 * One width down the page is what makes the pictures read as a column rather
 * than as separately sized illustrations. The height is left to the photo:
 * a 4:5 portrait stands 320px here and a 3:2 landscape 213px, which is how a
 * section that is one sentence long stops carrying a picture twice the height
 * of its own copy.
 */
const WRITEUP_PHOTO_COLUMN =
  // `pl-4` on a phone only. Stacked, the photo sits under copy that is already
  // indented by the width of its team bar, and a picture starting 16px to the
  // left of every line above it reads as a bleed rather than as alignment.
  // Beside the copy from `md` up there is nothing to line up with, so it goes.
  //
  // No width cap below `md`: stacked, a landscape photo should run the width of
  // the copy it follows, and capping it at 16rem left it stopping a third of
  // the way short of every line above it, which reads as a thumbnail somebody
  // forgot to finish. A portrait still needs the cap — at full phone width it
  // paints 488px tall — and gets it from `WriteUpNewsPhoto`, which knows the
  // photo's own shape.
  'mt-3 pl-4 md:mt-0 md:w-48 md:pl-0 lg:w-64';

/**
 * The same column in a section that carries no team bar.
 *
 * The `pl-4` above exists to line a stacked photo up with copy that a 3px bar
 * has already pushed 16px right. Where there is no bar there is nothing to line
 * up with, and the indent reads as a picture nudged out of the column for no
 * reason.
 */
const WRITEUP_PHOTO_COLUMN_FLUSH = 'mt-3 md:mt-0 md:w-48 lg:w-64';

/** The photo column of a mirrored section: first column, same row. */
const WRITEUP_PHOTO_COLUMN_MIRRORED = `${WRITEUP_PHOTO_COLUMN} md:col-start-1 md:row-start-1`;

/** And the same without the phone indent, for a section with no team bar. */
const WRITEUP_PHOTO_COLUMN_MIRRORED_FLUSH = `${WRITEUP_PHOTO_COLUMN_FLUSH} md:col-start-1 md:row-start-1`;

/**
 * Copy and photo as siblings, so a team bar ends where the copy ends.
 *
 * Used on its own when the heading lives outside the grid (the seat card
 * under Hadjar's replacement), and inside {@link RaceWriteupPhotoSection}
 * for the ordinary case.
 */
export function RaceWriteupPhotoLayout({
  mirrored = false,
  teamColour,
  photo,
  children,
}: {
  mirrored?: boolean;
  /** Team token, painted as the 3px bar on the copy. Omit when there is none. */
  teamColour?: string;
  photo: ReactNode;
  children: ReactNode;
}) {
  const copyClass = [
    'md:max-w-3xl',
    teamColour ? 'gpp-team-bar pl-4' : null,
    mirrored ? WRITEUP_COPY_MIRRORED : null,
  ]
    .filter(Boolean)
    .join(' ');
  const photoClass = mirrored
    ? teamColour
      ? WRITEUP_PHOTO_COLUMN_MIRRORED
      : WRITEUP_PHOTO_COLUMN_MIRRORED_FLUSH
    : teamColour
      ? WRITEUP_PHOTO_COLUMN
      : WRITEUP_PHOTO_COLUMN_FLUSH;

  return (
    <div
      className={mirrored ? WRITEUP_WITH_PHOTO_MIRRORED : WRITEUP_WITH_PHOTO}
    >
      <div
        className={copyClass}
        style={
          teamColour
            ? ({ '--team-colour': teamColour } as CSSProperties)
            : undefined
        }
      >
        {children}
      </div>
      <div className={photoClass}>{photo}</div>
    </div>
  );
}

/**
 * A labelled write-up section whose margin is a photograph.
 *
 * The heading sits in the copy column so the team bar, when there is one,
 * covers the title it belongs to.
 */
export function RaceWriteupPhotoSection({
  id,
  heading,
  mirrored,
  teamColour,
  photo,
  children,
}: {
  id: string;
  heading: ReactNode;
  mirrored?: boolean;
  teamColour?: string;
  photo: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="py-8 sm:py-16" aria-labelledby={id}>
      <RaceWriteupPhotoLayout
        mirrored={mirrored}
        teamColour={teamColour}
        photo={photo}
      >
        <h2 id={id} className={RACE_WRITEUP_SECTION_HEADING}>
          {heading}
        </h2>
        {children}
      </RaceWriteupPhotoLayout>
    </section>
  );
}
