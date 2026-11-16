/**
 * The three ways a Top 5 pick scores, as flat rows with a sector-colour rule.
 *
 * The landing page and the predictions hub each had their own copy: the hub's
 * as bordered cards with full-caps "POINTS" and different wording ("Elsewhere
 * in the top 5" against "In the actual Top 5"). Same three facts, so one list.
 */
const scoringBands = [
  {
    points: 5,
    unit: 'points',
    title: 'Exact position',
    copy: 'Your driver finishes exactly where you predicted.',
    textClass: 'text-result-exact',
    ruleClass: 'border-result-exact',
  },
  {
    points: 3,
    unit: 'points',
    title: 'One position away',
    copy: 'Your driver finishes one place above or below your pick.',
    textClass: 'text-result-near',
    ruleClass: 'border-result-near',
  },
  {
    points: 1,
    unit: 'point',
    title: 'In the actual Top 5',
    copy: 'Your driver finishes in the Top 5, two or more places from your pick.',
    textClass: 'text-result-top5',
    ruleClass: 'border-result-top5',
  },
] as const;

export function ScoringBands({ className = '' }: { className?: string }) {
  return (
    <dl className={`grid content-start gap-x-8 gap-y-5 ${className}`}>
      {scoringBands.map((band) => (
        <div key={band.points} className={`border-t-2 pt-3 ${band.ruleClass}`}>
          <dt className="flex items-baseline gap-3">
            <span
              className={`gpp-mono text-3xl leading-none font-semibold ${band.textClass}`}
            >
              {band.points}
              <span className="sr-only"> {band.unit}</span>
            </span>
            <span className="font-semibold text-text">{band.title}</span>
          </dt>
          <dd className="gpp-reading-copy mt-2 text-text-muted">{band.copy}</dd>
        </div>
      ))}
    </dl>
  );
}
