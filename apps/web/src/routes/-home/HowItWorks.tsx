/**
 * How the game works: one accessible section heading, then three concise steps
 * separated by timing-tower rules.
 *
 * The Score copy states the real bands from scoreTopFive() in
 * apps/backend/convex/lib/scoring.ts (5 exact, 3 one place out, 1 elsewhere in
 * the top five, 0 otherwise). If those numbers move, this moves with them.
 */
const STEPS = [
  {
    label: 'Pick',
    body: 'Top 5 and teammate battles, for every session of the weekend. Two sets of calls, two sets of points.',
  },
  {
    label: 'Score',
    body: 'Exact position pays most at five points. One place out still pays three. A call that misses costs you nothing but pride.',
  },
  {
    label: 'Climb',
    body: 'One global table. Or make a private league and keep it personal.',
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-20 border-t border-border px-4 py-10 sm:py-12"
    >
      <h2 id="how-it-works-heading" className="sr-only">
        How Grand Prix Picks works
      </h2>
      <div className="mx-auto grid w-full max-w-5xl border-t border-border sm:grid-cols-3 sm:border-t-0 sm:border-l">
        {STEPS.map((step) => (
          <div
            key={step.label}
            className="border-b border-border px-0 py-5 sm:border-r sm:border-b-0 sm:px-5 sm:py-1 sm:last:border-r-0"
          >
            <h3 className="text-lg font-medium text-text">{step.label}</h3>
            <p className="gpp-reading-copy mt-2 text-text-muted">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
