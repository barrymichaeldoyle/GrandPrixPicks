import type { ReactNode } from 'react';

export function SettingsSection({
  id,
  title,
  icon,
  headerRight,
  children,
  className = '',
  contentClassName = 'px-4 py-4',
}: {
  id?: string;
  title: string;
  icon: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      id={id}
      /*
       * Two pieces of sticky chrome sit above a settings section on a phone:
       * the header, and the tab strip under it. `scroll-mt-24` cleared only
       * the header, so clicking "Regional" put the heading 13px behind the
       * strip. The strip is ~2.75rem tall, so the offset has to clear both.
       *
       * From `md` the strip is a sidebar in its own column rather than
       * chrome over the content, so only the header needs clearing there.
       */
      className={`settings-section-shell scroll-mt-[calc(var(--nav-height)+3.75rem)] rounded-sm border border-border bg-surface md:scroll-mt-[calc(var(--nav-height)+1rem)] ${className}`}
    >
      <div className="settings-section-header flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-title text-base font-semibold text-text">
            {title}
          </h2>
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
