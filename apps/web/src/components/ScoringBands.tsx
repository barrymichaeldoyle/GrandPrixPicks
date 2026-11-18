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
    fieldClass: 'bg-result-exact',
  },
  {
    points: 3,
    unit: 'points',
    title: 'One position away',
    copy: 'Your driver finishes one place above or below your pick.',
    textClass: 'text-result-near',
    ruleClass: 'border-result-near',
    fieldClass: 'bg-result-near',
  },
  {
    points: 1,
    unit: 'point',
    title: 'In the actual Top 5',
    copy: 'Your driver finishes in the Top 5, two or more places from your pick.',
    textClass: 'text-result-top5',
    ruleClass: 'border-result-top5',
    fieldClass: 'bg-result-top5',
  },
] as const;

/**
 * `rule` is the product register: a sector-colour rule over each row.
 * `field` is the display register (`docs/design-display-register.md`) for
 * the landing page: each band is a block of its own scoring colour, the same
 * colour a pick wears on the results it earns, with near-black ink on it (all
 * three clear 4.5:1).
 */
export function ScoringBands({
  className = '',
  variant = 'rule',
}: {
  className?: string;
  variant?: 'rule' | 'field';
}) {
  if (variant === 'field') {
    return (
      <dl className={`grid content-start gap-1 ${className}`}>
        {scoringBands.map((band) => (
          <div
            key={band.points}
            className={`grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 px-4 py-4 text-text-on-accent sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:px-5 ${band.fieldClass}`}
          >
            <dt className="contents">
              <span className="gpp-hero-digits row-span-2 text-current">
                {band.points}
                <span className="sr-only"> {band.unit}</span>
              </span>
              <span className="text-lg leading-tight font-semibold">
                {band.title}
              </span>
            </dt>
            <dd className="col-start-2 mt-0.5 text-sm leading-snug">
              {band.copy}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

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
