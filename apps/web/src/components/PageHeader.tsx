import type { ReactNode } from 'react';

type PageHeaderProps = {
  /** Small accent label above the title, e.g. "Legal" or "Game guide". */
  eyebrow?: string;
  title: string;
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
  subtitle,
  actions,
  actionsPlacement = 'below',
  className,
}: PageHeaderProps) {
  const heading = (
    <div>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-title text-3xl font-semibold text-text sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
          {subtitle}
        </p>
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
