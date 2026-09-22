import type { ReactNode } from 'react';

/**
 * The heading style every write-up section shares.
 *
 * Exported because a page that cannot use this shell — a photo section, an
 * archive block — still has to look like one.
 */
export const RACE_WRITEUP_SECTION_HEADING =
  'font-title text-2xl font-medium text-text sm:text-3xl';

/**
 * A labelled write-up section: heading, prose, optional margin, optional extra.
 *
 * The copy stays in the page. This is the frame it sits in, so a change to
 * the heading scale or the `lg` split lands on every write-up at once.
 *
 * `aside` is the right-hand column at `lg` (a photo, a fact list). `extra` is
 * full-width below that row: a lap map, a session grid. The two
 * are separate because a figure that belongs under the prose should not have
 * to live in the margin, and a margin card should not have to share a row
 * with a four-up strip.
 */
export function RaceWriteupSection({
  id,
  heading,
  aside,
  extra,
  children,
}: {
  id: string;
  heading: ReactNode;
  aside?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const headingEl = (
    <h2 id={id} className={RACE_WRITEUP_SECTION_HEADING}>
      {heading}
    </h2>
  );

  return (
    <section className="py-8 sm:py-16" aria-labelledby={id}>
      {aside ? (
        // The aside floats into the prose rather than owning a column. As a
        // column it was pinned to the top of the section with nothing under
        // it however long the prose ran, so a photo read as crammed into a
        // corner above an empty margin. Floated, the prose wraps beside it
        // and continues full width underneath, as a magazine sets a picture.
        //
        // It hangs half its width into the margin (`-mr-48` on a 24rem
        // float) so the prose keeps the same `max-w-3xl` measure as every
        // other section: about 34rem beside the photo and the full column
        // below it. Floated flush, the lines under it would have run the
        // width of the page. Below `lg` it is an ordinary block between the
        // heading and the prose.
        <div className="max-w-3xl">
          {headingEl}
          <div className="mt-4 lg:float-right lg:-mr-48 lg:mb-4 lg:ml-8 lg:w-96">
            {aside}
          </div>
          {children}
          <div className="clear-both" />
        </div>
      ) : (
        <div className="max-w-3xl">
          {headingEl}
          {children}
        </div>
      )}
      {extra}
    </section>
  );
}

/**
 * The id of each write-up's circuit section, and the write-ups' one in-page
 * destination: the hero's secondary action scrolls here.
 *
 * The value predates the section's current shape. It stays, because a shared
 * link to `#what-to-watch` should still land on the circuit.
 */
export const RACE_WRITEUP_CIRCUIT_ANCHOR = 'what-to-watch';

/**
 * A figure set in bold inside a write-up paragraph: a lap length, a lap
 * count, a temperature.
 *
 * The figures used to sit in a four-up strip of large numerals above the
 * prose, and a reader got "6.003 / km circuit" without what it meant. Written
 * into the sentence, the number and its meaning arrive together, and the bold
 * keeps them findable at a glance.
 */
export function RaceWriteupFigure({ children }: { children: string }) {
  return <strong className="font-semibold text-text">{children}</strong>;
}
