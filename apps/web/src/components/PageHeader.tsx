import type { ReactNode } from 'react';

type PageHeaderProps = {
  /** Small accent label above the title, e.g. "Legal" or "Game guide". */
  eyebrow?: string;
  title: string;
  /**
   * Show the title as a placeholder because the data behind it has not arrived.
   *
   * For a title that changes once a query lands ("Your race weekend" becoming
   * "Welcome back, Barry"), the fallback wording is not a neutral default: it
   * is a different sentence, and swapping it under the reader is the same
   * wrong-then-right flash the page's cards already avoid with skeletons.
   *
   * `title` is still what assistive tech reads, so the page never carries an
   * unlabelled `h1`, and the placeholder is sized to the rendered line so
   * nothing moves when the real title replaces it.
   */
  titleLoading?: boolean;
  subtitle?: ReactNode;
  /** Buttons or links rendered beneath the supporting copy. */
  actions?: ReactNode;
  /**
   * Where `actions` sit. Content pages want them below the copy; index pages
   * (leaderboard, leagues, races) want the primary action beside the title on
   * wide screens, dropping under it on mobile.
   */
  actionsPlacement?: 'below' | 'trailing';
  className?: string;
};

/**
 * The header for every top-level page: flat on the page background, with an
 * accent eyebrow, a display title and optional supporting copy.
 *
 * This replaced the old bordered `PageHero` panel. Keep it flat — the
 * site's page-level idiom is sections separated by hairline rules on the page
 * background, not a card stacked on top of more cards. If a page needs a
 * visual anchor, give it a stronger eyebrow or a first section, not a border
 * around the title.
 */
export function PageHeader({
  eyebrow,
  title,
  titleLoading = false,
  subtitle,
  actions,
  actionsPlacement = 'below',
  className,
}: PageHeaderProps) {
  const heading = (
    <div>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold tracking-label text-accent uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-title text-3xl font-semibold text-text sm:text-4xl">
        {titleLoading ? (
          <>
            <span className="sr-only">{title}</span>
            {/* h-9 / sm:h-10 are the line boxes of text-3xl / text-4xl, so the
                real title lands in exactly this space. */}
            <span
              aria-hidden
              className="block h-9 w-72 max-w-full animate-pulse rounded bg-surface-muted sm:h-10"
            />
          </>
        ) : (
          title
        )}
      </h1>
      {/* A string is the common case and gets a paragraph. Anything richer
          (the leaderboard runs a second line with a link in it) is rendered
          as-is, because nesting block content inside that <p> is invalid. */}
      {typeof subtitle === 'string' ? (
        <p className="gpp-reading-copy mt-4 max-w-2xl text-text-muted">
          {subtitle}
        </p>
      ) : subtitle ? (
        <div className="gpp-reading-copy mt-4 max-w-2xl text-text-muted">
          {subtitle}
        </div>
      ) : null}
    </div>
  );

  if (actions && actionsPlacement === 'trailing') {
    return (
      <header className={`mb-10 ${className ?? ''}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          {heading}
          {actions}
        </div>
      </header>
    );
  }

  return (
    <header className={`mb-10 ${className ?? ''}`}>
      {heading}
      {actions ? <div className="mt-6">{actions}</div> : null}
    </header>
  );
}
