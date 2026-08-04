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
 *
 * This is for pages you *read*. A utility destination reached from the nav
 * (notifications) wants its own small header instead: a display title over a
 * sentence describing the page is worth its space on `/leaderboard`, and is
 * half a phone screen of nothing on a page the reader opened on purpose.
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
  const titleClass = 'font-title text-3xl font-semibold text-text sm:text-4xl';
  // Line box of the title size above, so the real title lands in exactly the
  // space the placeholder held.
  const placeholderClass =
    'block h-9 w-72 max-w-full animate-pulse rounded bg-surface-muted sm:h-10';
  const subtitleClass = 'gpp-reading-copy mt-4 max-w-2xl text-text-muted';

  const heading = (
    <div>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold tracking-label text-accent uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className={titleClass}>
        {titleLoading ? (
          <>
            <span className="sr-only">{title}</span>
            <span aria-hidden className={placeholderClass} />
          </>
        ) : (
          title
        )}
      </h1>
      {/* A string is the common case and gets a paragraph. Anything richer
          (the leaderboard runs a second line with a link in it) is rendered
          as-is, because nesting block content inside that <p> is invalid. */}
      {typeof subtitle === 'string' ? (
        <p className={subtitleClass}>{subtitle}</p>
      ) : subtitle ? (
        <div className={subtitleClass}>{subtitle}</div>
      ) : null}
    </div>
  );

  const headerClass = `mb-10 ${className ?? ''}`;

  if (actions && actionsPlacement === 'trailing') {
    return (
      <header className={headerClass}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          {heading}
          {actions}
        </div>
      </header>
    );
  }

  return (
    <header className={headerClass}>
      {heading}
      {actions ? <div className="mt-6">{actions}</div> : null}
    </header>
  );
}
