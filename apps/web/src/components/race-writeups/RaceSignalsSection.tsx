import type { ReactNode } from 'react';

import { CircuitStatStrip } from './CircuitStatStrip';

/**
 * One thing worth watching over a race weekend: what to call it, what to look
 * for, and why it changes a pick. Positional rather than named because the page
 * data is written as prose triples and reads better that way.
 */
export type RaceSignal = readonly [
  signal: string,
  lookFor: string,
  whyItMatters: string,
];

/**
 * The "what matters here" section of a race write-up: a heading, the author's
 * framing, the circuit's figures, and the signals table.
 *
 * The prose and the numbers are the point of each page and stay in the page.
 * This is only the shell they are poured into, so a change to the table's
 * shape lands on every write-up at once instead of four times.
 */
export function RaceSignalsSection({
  heading,
  stats,
  signals,
  children,
}: {
  heading: string;
  stats?: readonly (readonly [value: string, label: string])[];
  signals: readonly RaceSignal[];
  /** The framing paragraphs between the heading and the figures. */
  children?: ReactNode;
}) {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="what-to-watch">
      <div className="max-w-3xl">
        <h2
          id="what-to-watch"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          {heading}
        </h2>
        {children}
      </div>

      {stats ? <CircuitStatStrip stats={stats} /> : null}

      <div className="mt-8">
        {/* Column headings for the table below. Hidden on small screens, where
            each row stacks and the headings would repeat every entry, and
            aria-hidden because each row already reads as a heading and two
            paragraphs. */}
        <div
          className="hidden grid-cols-[10rem_1fr_1fr] gap-8 px-4 pb-3 text-xs font-semibold tracking-label text-text-muted uppercase sm:grid sm:px-5"
          aria-hidden
        >
          <span>Signal</span>
          <span>Look for</span>
          <span>Why it matters</span>
        </div>
        <div className="rounded-sm bg-surface px-4 sm:px-5">
          {signals.map(([signal, lookFor, whyItMatters]) => (
            <div
              key={signal}
              className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[10rem_1fr_1fr] sm:gap-8"
            >
              <h3 className="font-title text-sm font-medium text-text">
                {signal}
              </h3>
              <p className="text-sm leading-6 text-text">{lookFor}</p>
              <p className="text-sm leading-6 text-text-muted">
                {whyItMatters}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
