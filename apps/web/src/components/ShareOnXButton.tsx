import { captureAnalyticsEvent } from '@/lib/analytics';
import { buildXShareIntentUrl } from '@/lib/share';
import type { AnalyticsEventName } from '@grandprixpicks/shared/analytics';

export function XLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface ShareOnXButtonProps {
  /** Pre-filled post copy (the share helper appends the link). */
  text: string;
  /** URL to attach to the post. */
  url: string;
  /** PostHog event name fired on click. */
  analyticsEvent: AnalyticsEventName;
  analyticsProps?: Record<string, string | number | boolean | undefined>;
  /**
   * Visible button text. Leave "on X" out of it: the logo beside it already
   * says where the post goes, and the accessible name below adds it back for
   * anyone who cannot see the logo.
   */
  label?: string;
  className?: string;
}

export function ShareOnXButton({
  text,
  url,
  analyticsEvent,
  analyticsProps,
  label = 'Share',
  className = '',
}: ShareOnXButtonProps) {
  return (
    <a
      href={buildXShareIntentUrl(text, url)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} on X`}
      onClick={() => captureAnalyticsEvent(analyticsEvent, analyticsProps)}
      className={`inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none ${className}`}
    >
      <XLogoIcon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </a>
  );
}
