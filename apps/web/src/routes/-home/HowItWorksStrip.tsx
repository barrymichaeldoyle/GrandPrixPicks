const HOW_IT_WORKS_STEPS: ReadonlyArray<{ title: string; copy: string }> = [
  { title: 'Pick your top 5', copy: 'Rank who you think finishes ahead.' },
  {
    title: 'Predict teammate battles',
    copy: 'Call each head-to-head for bonus points.',
  },
  {
    title: 'Score points and climb',
    copy: 'Earn points every session and rise up the leaderboard.',
  },
];

export function HowItWorksStrip() {
  return (
    <div>
      <p className="mb-4 text-xs font-semibold tracking-widest text-text-muted uppercase">
        How it works
      </p>
      {/* CSS reveal, not framer-motion: this strip is inside the first mobile
          viewport, and a JS-gated fade leaves it invisible until hydration. */}
      <ol className="reveal-up reveal-delay-1 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
        {HOW_IT_WORKS_STEPS.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-bold text-accent tabular-nums">
              {i + 1}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-text">
                {step.title}
              </span>
              <span className="text-xs text-text-muted">{step.copy}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
