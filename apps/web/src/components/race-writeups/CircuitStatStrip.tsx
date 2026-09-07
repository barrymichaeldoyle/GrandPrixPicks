import type { ReactNode } from 'react';

/**
 * The four-up figure strip that opens a circuit section: lap length, race laps,
 * corner count, local start time, or whatever else the venue is known for.
 *
 * A definition list rather than a table because each figure is a term and its
 * value, not a row in a grid of comparable records.
 *
 * The label takes a node rather than a string so a figure belonging to a person
 * can carry their flag, the way a driver's name does everywhere else on the
 * site. That is also why the key is the index: a label is no longer reliably a
 * string, and two figures in one strip can legitimately share a value.
 *
 * Labels are sentence case, not the site's uppercase tracked label style. That
 * style is for one- or two-word column headings on a timing sheet; these
 * labels are short phrases with names and punctuation in them, and
 * "INTO THE BARRIERS" or "FASTEST: UGOCHUKWU" set wide and uppercase reads as
 * decoration rather than as a caption. The mono figure above carries the
 * timing-sheet character on its own.
 */
export function CircuitStatStrip({
  stats,
}: {
  stats: readonly (readonly [value: string, label: ReactNode])[];
}) {
  return (
    <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-4">
      {stats.map(([value, label], index) => (
        /* The label is the term and the number is its value, so dt names the
           stat and dd carries the figure. The column is reversed in CSS
           because the design still wants the number read first. */
        <div
          key={index}
          className="flex flex-col-reverse bg-surface p-4 sm:p-5"
        >
          <dt className="mt-1.5 flex items-center gap-1.5 text-sm text-text-muted">
            {label}
          </dt>
          <dd className="gpp-mono text-2xl text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
