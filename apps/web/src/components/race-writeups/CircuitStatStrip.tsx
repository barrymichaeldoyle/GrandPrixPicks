/**
 * The four-up figure strip that opens a circuit section: lap length, race laps,
 * corner count, local start time, or whatever else the venue is known for.
 *
 * A definition list rather than a table because each figure is a term and its
 * value, not a row in a grid of comparable records.
 */
export function CircuitStatStrip({
  stats,
}: {
  stats: readonly (readonly [value: string, label: string])[];
}) {
  return (
    <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-4">
      {stats.map(([value, label]) => (
        /* The label is the term and the number is its value, so dt names the
           stat and dd carries the figure. The column is reversed in CSS
           because the design still wants the number read first. */
        <div
          key={label}
          className="flex flex-col-reverse bg-surface p-4 sm:p-5"
        >
          <dt className="mt-1 text-xs tracking-label text-text-muted uppercase">
            {label}
          </dt>
          <dd className="gpp-mono text-2xl text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
