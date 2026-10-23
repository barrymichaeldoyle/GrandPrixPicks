import { Check, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';

type ShareMethod = 'share_sheet' | 'copy';

interface SharePicksButtonProps {
  /** The message; the link goes after it. */
  text: string;
  url: string;
  analyticsProps?: Record<string, string | number | boolean | undefined>;
  /**
   * `inline` sits in a label row beside "Edit"; `outline` is the pill that
   * matches `ShareOnXButton` on the race page.
   */
  appearance?: 'inline' | 'outline';
  className?: string;
}

/**
 * Shares a Top 5 where this site's players actually talk: the phone's share
 * sheet when there is one (WhatsApp, Messages, Telegram), otherwise the
 * clipboard. The X button beside it is for a timeline; this is for a group.
 *
 * Text and link are kept as separate fields for the sheet, so an app that
 * only takes one of them still gets the link. A dismissed sheet is not an
 * error and is not counted as a share.
 */
export function SharePicksButton({
  text,
  url,
  analyticsProps,
  appearance = 'inline',
  className = '',
}: SharePicksButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function share() {
    const message = `${text}\n${url}`;
    let method: ShareMethod = 'copy';
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      method = 'share_sheet';
      try {
        await navigator.share({ text, url });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        // No share target for this payload: fall through to the clipboard.
        method = 'copy';
      }
    }
    if (method === 'copy') {
      try {
        await navigator.clipboard.writeText(message);
      } catch {
        return;
      }
      setCopied(true);
    }
    captureAnalyticsEvent('picks_shared', { ...analyticsProps, method });
  }

  if (appearance === 'outline') {
    return (
      <button
        type="button"
        onClick={() => void share()}
        aria-live="polite"
        className={`inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none ${className}`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Share2 className="h-3.5 w-3.5" aria-hidden />
        )}
        <span>{copied ? 'Link copied' : 'Share'}</span>
      </button>
    );
  }

  return (
    <Button
      variant="text"
      size="inline"
      leftIcon={copied ? Check : Share2}
      onClick={() => void share()}
      aria-live="polite"
      className={className}
      data-testid="share-picks"
    >
      {copied ? 'Link copied' : 'Share'}
    </Button>
  );
}
