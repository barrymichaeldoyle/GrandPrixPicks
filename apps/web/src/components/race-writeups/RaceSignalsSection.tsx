import type { ReactNode } from 'react';

import { CircuitStatStrip } from './CircuitStatStrip';

/**
 * The id of this section, and the write-ups' one in-page destination.
 *
 * Exported because the hero's secondary action scrolls here rather than
 * leaving for `/circuits/:slug`. That page is noindex and canonicalises back
 * to the write-up, so the old link sent a reader out of the page they were
 * reading and into a subset of it. See `circuitPageSeo.ts`.
 */
export const RACE_SIGNALS_ANCHOR = 'what-to-watch';

/**
 * One thing worth watching over a race weekend: what to call it, what to look
 * for, and why it changes a pick. Positional rather than named because the page
 * data is written as prose triples and reads better that way.
 *
 * `lookFor` is written without its full stop: the two halves are set as one
 * sentence pair, and the component supplies the punctuation between them.
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
  stats?: readonly (readonly [value: string, label: ReactNode])[];
  signals: readonly RaceSignal[];
  /** The framing paragraphs between the heading and the figures. */
  children?: ReactNode;
}) {
  return (
    <section className="py-8 sm:py-16" aria-labelledby={RACE_SIGNALS_ANCHOR}>
      <div className="max-w-3xl">
        <h2
          id={RACE_SIGNALS_ANCHOR}
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          {heading}
        </h2>
        {children}
      </div>

      {stats ? <CircuitStatStrip stats={stats} /> : null}

      {/* Rows, not a table. The three-column grid under SIGNAL / LOOK FOR /
          WHY IT MATTERS headings turned three written sentences into
          spreadsheet cells, and a reader scrolled past it the way they scroll
          past a spec sheet. Each entry now reads as what it is: a thing to
          watch, then the sentence explaining it. */}
      <div className="mt-8 max-w-3xl">
        {signals.map(([signal, lookFor, whyItMatters]) => (
          <div
            key={signal}
            className="border-b border-border py-5 last:border-b-0"
          >
            <h3 className="font-title font-medium text-text">{signal}</h3>
            <p className="gpp-reading-copy mt-2 text-text-muted">
              <span className="text-text">{lookFor}.</span> {whyItMatters}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
