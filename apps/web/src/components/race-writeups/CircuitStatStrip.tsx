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
          <dt className="mt-1 flex items-center gap-1.5 text-xs tracking-label text-text-muted uppercase">
            {label}
          </dt>
          <dd className="gpp-mono text-2xl text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
