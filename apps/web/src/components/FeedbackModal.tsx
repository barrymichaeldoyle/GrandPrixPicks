import { api } from '@convex-generated/api';
import { useMutation } from 'convex/react';
import { Check, Loader2, X } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button/Button';
import { useModalDialog } from '@/hooks/useModalDialog';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { toUserFacingMessage } from '@/lib/userFacingError';

export type FeedbackCategory = 'feedback' | 'bug' | 'question';

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'feedback', label: 'Feedback' },
  { id: 'bug', label: 'Bug' },
  { id: 'question', label: 'Question' },
];

const PLACEHOLDERS: Record<FeedbackCategory, string> = {
  feedback: 'What would make the game better?',
  bug: 'What went wrong, and what were you doing at the time?',
  question: 'What do you want to know?',
};

const MAX_MESSAGE_LENGTH = 5000;

/**
 * Feedback where the player already is, rather than a page they have to go to.
 *
 * `/support` still exists and still handles the long conversation, but it asks
 * for a subject, a category and a message on a route nobody visits mid-game.
 * The thought people actually have ("this column should be sortable") is one
 * sentence long and evaporates in the time it takes to navigate, so this is one
 * box and a send button. The subject the inbox needs is derived from the first
 * line server-side (see `support.submitRequest`), which is the field this
 * deliberately does not ask for.
 *
 * Signed-in only: it writes as the viewer, so there is no sign-in dance here.
 * A signed-out visitor gets `/support`, which handles that case properly.
 */
export function FeedbackModal({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  /** Where the modal was opened from, for analytics only. */
  source: string;
}) {
  const submitRequest = useMutation(api.support.submitRequest);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useModalDialog<HTMLDivElement>({
    open,
    onClose,
    initialFocusRef: messageRef,
  });

  const [category, setCategory] = useState<FeedbackCategory>('feedback');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await submitRequest({ message: trimmed, category });
      captureAnalyticsEvent('feedback_widget_submitted', {
        category,
        source,
        length: trimmed.length,
      });
      setSent(true);
      setMessage('');
    } catch (err) {
      captureAnalyticsEvent('feedback_widget_submit_failed', {
        category,
        source,
      });
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'That did not send. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-heading"
        tabIndex={-1}
        className="w-full max-w-md rounded-sm border border-border bg-surface outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2
            id="feedback-modal-heading"
            className="text-sm font-semibold text-text"
          >
            {sent ? 'Thanks' : 'Send feedback'}
          </h2>
          <button
            type="button"
            aria-label="Close feedback"
            onClick={onClose}
            className="rounded-sm p-1 text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="px-4 py-6 text-center">
            <Check
              className="mx-auto mb-3 h-8 w-8 text-accent"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-sm text-text">That is with Barry now.</p>
            <p className="mt-1 text-xs text-text-muted">
              Every message gets read, and the good ones get built.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSent(false);
                  setError(null);
                }}
              >
                Send another
              </Button>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
            <div
              className="flex flex-wrap gap-2 text-xs"
              role="group"
              aria-label="Feedback type"
            >
              {CATEGORIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={category === option.id}
                  onClick={() => setCategory(option.id)}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    category === option.id
                      ? 'bg-accent text-text-on-accent'
                      : 'bg-surface-muted text-text-muted hover:bg-surface-elevated hover:text-text'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label htmlFor="feedback-message" className="sr-only">
              Your message
            </label>
            <textarea
              id="feedback-message"
              ref={messageRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={4}
              required
              placeholder={PLACEHOLDERS[category]}
              className="w-full resize-y rounded-sm border border-border bg-surface-elevated px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />

            {error ? (
              <p role="alert" className="text-xs text-error">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                Goes straight to Barry, with your account attached.
              </p>
              <Button
                type="submit"
                size="sm"
                loading={isSubmitting}
                disabled={!message.trim()}
                leftIcon={isSubmitting ? Loader2 : undefined}
              >
                {isSubmitting ? 'Sending' : 'Send'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
