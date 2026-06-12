import { X } from 'lucide-react';

import { captureAnalyticsEvent } from '@/lib/analytics';
import { siteConfig } from '@/lib/site';

import { XLogoIcon } from './ShareOnXButton';

const STORAGE_KEY = 'gpp:xFollowPromptDone';

/** True once the user has followed or dismissed the prompt on this device. */
export function hasCompletedFollowPrompt() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

function markFollowPromptCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable — the prompt may show again, which is harmless.
  }
}

/**
 * One-time nudge to follow the brand X account, shown right after the user
 * saves their first prediction (the moment they're most invested).
 */
export function FollowXPrompt({ onDismiss }: { onDismiss: () => void }) {
  function complete(action: 'followed' | 'dismissed') {
    markFollowPromptCompleted();
    captureAnalyticsEvent('x_follow_prompt_completed', { action });
    onDismiss();
  }

  return (
    <div
      data-testid="follow-x-prompt"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/35 bg-accent-muted/20 px-4 py-3"
    >
      <p className="text-sm text-text">
        <span className="font-semibold">Picks locked in!</span> Follow{' '}
        {siteConfig.social.x.handle} on X for race-week reminders and results.
      </p>
      <div className="flex items-center gap-2">
        <a
          href={siteConfig.social.x.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => complete('followed')}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
        >
          <XLogoIcon className="h-3.5 w-3.5" />
          <span>Follow {siteConfig.social.x.handle}</span>
        </a>
        <button
          type="button"
          onClick={() => complete('dismissed')}
          aria-label="Dismiss"
          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
