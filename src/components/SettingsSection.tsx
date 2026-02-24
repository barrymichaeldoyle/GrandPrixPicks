import type { ReactNode } from 'react';

export function SettingsSection({
  title,
  icon,
  headerRight,
  children,
  className = '',
  contentClassName = 'px-4 py-4',
}: {
  title: string;
  icon: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-text">{title}</h2>
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
