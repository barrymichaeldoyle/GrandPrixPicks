import type { ReactNode } from 'react';

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  subtitle,
  icon,
  rightSlot,
  className,
}: PageHeroProps) {
  return (
    <header
      className={`page-hero reveal-up mb-6 rounded-2xl border border-border/70 bg-surface/70 p-5 backdrop-blur-[1px] sm:p-6 ${className ?? ''}`}
    >
      <div
        className={
          rightSlot
            ? 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
            : undefined
        }
      >
        <div className="min-w-0">
          {eyebrow ? (
            <p className="page-hero-eyebrow mb-3 inline-flex items-center rounded-full border border-border bg-surface-muted/70 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="page-hero-title flex items-center gap-2 text-3xl font-bold text-text">
            {icon}
            {title}
          </h1>
          {subtitle ? (
            <p className="page-hero-subtitle mt-1 text-text-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
        {rightSlot ? (
          <div className="shrink-0 self-start">{rightSlot}</div>
        ) : null}
      </div>
    </header>
  );
}
