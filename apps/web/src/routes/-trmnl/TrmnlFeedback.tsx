import { api } from '@convex-generated/api';
import { useConvexAuth, useMutation } from 'convex/react';
import type { SubmitEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button/Button';
import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from '@/integrations/clerk/runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { toUserFacingMessage } from '@/lib/userFacingError';

const MAX_MESSAGE_LENGTH = 5000;
const SOURCE = 'trmnl_page';

/**
 * Feedback on the TRMNL plugin, from the page its directory listing links to.
 *
 * It lands in the support inbox as category `trmnl`, through the same
 * `support.submitRequest` as every other feedback box. Sending needs an
 * account, on purpose: someone who installed the plugin from TRMNL's
 * directory has never seen the site, and this is the moment they have a
 * reason to sign up.
 *
 * A signed-out visitor writes first and signs in on send; finishing sign-in
 * sends it, as on `/support`. `/trmnl` is a Clerk-free route, so sign-in goes
 * through `requestSignIn`, which opens the modal beside the page without
 * remounting it, and the draft survives.
 */
export function TrmnlFeedback() {
  const submitRequest = useMutation(api.support.submitRequest);
  // Convex-level auth: the mutation writes as the viewer, and Clerk reporting a
  // session is not yet the token reaching Convex.
  const { isAuthenticated } = useConvexAuth();
  const { requestSignIn, signInPending } = useClerkRuntimeControl();
  const warmHandlers = useClerkWarmHandlers();

  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  /** Set when a signed-out visitor presses send, so sign-in sends it. */
  const [sendAfterSignIn, setSendAfterSignIn] = useState(false);
  const autoSentRef = useRef(false);

  async function send() {
    const trimmed = message.trim();
    if (!trimmed || isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitRequest({ message: trimmed, category: 'trmnl' });
      captureAnalyticsEvent('feedback_widget_submitted', {
        category: 'trmnl',
        source: SOURCE,
        length: trimmed.length,
      });
      setMessage('');
      setSent(true);
    } catch (err) {
      captureAnalyticsEvent('feedback_widget_submit_failed', {
        category: 'trmnl',
        source: SOURCE,
      });
      setError(
        err instanceof Error
          ? toUserFacingMessage(err, 'Your feedback wasn’t sent. Try again.')
          : 'Your feedback wasn’t sent. Try again.',
      );
    } finally {
      setIsSubmitting(false);
      setSendAfterSignIn(false);
    }
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }
    if (!isAuthenticated) {
      captureAnalyticsEvent('feedback_widget_signin_prompted', {
        source: SOURCE,
      });
      autoSentRef.current = false;
      setSendAfterSignIn(true);
      requestSignIn();
      return;
    }
    void send();
  }

  // Pressing send was the decision; asking for a second press after sign-in
  // would be asking twice.
  useEffect(() => {
    if (!sendAfterSignIn || !isAuthenticated || autoSentRef.current) {
      return;
    }
    autoSentRef.current = true;
    void send();
    // `send` closes over the current draft and is recreated each render; the
    // ref guard is what keeps this to a single submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendAfterSignIn, isAuthenticated]);

  return (
    <section
      aria-labelledby="trmnl-feedback-heading"
      className="mt-8 border-t border-border pt-6"
    >
      <h2
        id="trmnl-feedback-heading"
        className="text-lg font-semibold text-text"
      >
        Feedback on the plugin
      </h2>

      {sent ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-text" aria-live="polite">
            Sent. Thanks.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setSent(false)}>
            Send more
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 max-w-2xl space-y-3">
          <label htmlFor="trmnl-feedback-message" className="sr-only">
            Your feedback
          </label>
          <textarea
            id="trmnl-feedback-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={4}
            required
            placeholder="What would make this better on your TRMNL?"
            className="w-full resize-y rounded-sm border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
          {error && (
            <p className="text-sm text-error" aria-live="assertive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="sm"
              {...(isAuthenticated ? {} : warmHandlers)}
              loading={isSubmitting || (sendAfterSignIn && signInPending)}
              disabled={!message.trim()}
            >
              {isAuthenticated ? 'Send feedback' : 'Sign in and send'}
            </Button>
            {!isAuthenticated && (
              <p className="text-sm text-text-muted">
                Sending needs a free Grand Prix Picks account.
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
