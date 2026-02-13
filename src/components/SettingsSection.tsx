import type { ReactNode } from 'react';

export function SettingsSection({
  title,
  icon,
  children,
  contentClassName = 'px-4 py-4',
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {icon}
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
