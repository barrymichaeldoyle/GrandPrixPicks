/**
 * The whole commercial ask.
 *
 * One line, once, at the bottom. On the creator's own hostname this is a real
 * outbound link; inside an embed the credit belongs on the host page as well,
 * because a link from within our own iframe points at us from us.
 *
 * The mark is the same three skewed bars as `components/Wordmark.tsx` and
 * `public/favicon.svg`, drawn in his ink rather than our chartreuse. Chartreuse
 * on coral is a fight, and a brand colour nobody asked for on someone else's
 * page reads as a sticker. Monochrome, it reads as a signature.
 */
function GrandPrixPicksMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 60 40"
    >
      <g transform="translate(28 20) skewX(-12) translate(-28 -20)">
        <rect x="7" y="14" width="12" height="24" />
        <rect x="24" y="2" width="12" height="36" />
        <rect x="41" y="20" width="12" height="18" />
      </g>
    </svg>
  );
}

export function PollFooter() {
  return (
    <footer className="mt-8 flex items-center justify-center gap-2 pb-8 text-xs text-[var(--chinwag-ink-muted)]">
      <span>Built by</span>
      {/* The underline sits on the label, not the anchor: on the anchor it
          draws straight through the mark. */}
      <a
        className="inline-flex items-center gap-1.5 text-[var(--chinwag-ink)] no-underline"
        href="https://grandprixpicks.com"
        rel="noopener"
        target="_blank"
      >
        <GrandPrixPicksMark className="h-3 w-[18px]" />
        <span className="underline underline-offset-2">Grand Prix Picks</span>
      </a>
    </footer>
  );
}
