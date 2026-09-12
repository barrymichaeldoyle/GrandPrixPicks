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
 * full-width below that row: a stat strip, a lap map, a session grid. The two
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
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            {headingEl}
            {children}
          </div>
          <div className="self-start">{aside}</div>
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
 * The stacked definition list that sits in a section's margin.
 *
 * Two write-ups needed the same sheet — Baku's relocated Saturday, Sepang's
 * "why this race is in Malaysia" — and a third would have been a third copy.
 */
export function RaceWriteupFactList({
  facts,
}: {
  facts: readonly (readonly [label: string, value: ReactNode])[];
}) {
  return (
    <dl className="self-start rounded-sm bg-surface-elevated px-4">
      {facts.map(([label, value]) => (
        <div key={label} className="border-b border-border py-4 last:border-0">
          <dt className="text-xs font-medium text-text-muted">{label}</dt>
          <dd className="mt-2 text-sm text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
