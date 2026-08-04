import type { ComponentType } from 'react';
import { Gauge } from 'lucide-react';

export function FeedItemSkeleton() {
  return (
    <div className="rounded-sm border border-border bg-surface px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-muted" />
          <div className="h-2.5 w-24 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}

export function FeedEmptyState({
  icon: Icon = Gauge,
  title,
  message,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  message: string;
  children?: React.ReactNode;
}) {
  // A dead end gets the compact treatment. The roomy version below is sized for
  // the variants that carry a call to action, where the height is buying an
  // invitation to do something; without one it is ~300px of a phone screen
  // spent saying "nothing here yet", directly under the one card on the
  // dashboard that actually wants attention.
  if (!children) {
    return (
      <div className="rounded-sm border border-border bg-surface px-4 py-5 text-center sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-text-muted/50" />
          {title ? (
            <h2 className="text-sm font-semibold text-text">{title}</h2>
          ) : null}
        </div>
        <p className={`${title ? 'mt-1.5' : ''} text-sm text-text-muted`}>
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-border bg-surface px-6 py-10 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-text-muted/50" />
      {title ? (
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      ) : null}
      <p className={`${title ? 'mt-2' : ''} text-sm text-text-muted`}>
        {message}
      </p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
