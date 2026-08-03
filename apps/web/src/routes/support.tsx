import { api } from '@convex-generated/api';
import { SUPPORT_EMAIL } from '@grandprixpicks/shared/contact';
import { createFileRoute } from '@tanstack/react-router';
import { useConvexAuth, useMutation } from 'convex/react';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { toUserFacingMessage } from '@/lib/userFacingError';

import { Button } from '@/components/Button/Button';
import { AppSignInButton } from '@/integrations/clerk/sign-in-button';
import { PageHeader } from '@/components/PageHeader';
import { pageMeta } from '@/lib/site';

export const Route = createFileRoute('/support')({
  component: SupportPage,
  head: () =>
    pageMeta({
      title: 'Support | Grand Prix Picks',
      description:
        'Get help with Grand Prix Picks. Submit bugs, ask questions, or share feedback with the developer.',
      path: '/support',
      noIndex: true,
    }),
});

/**
 * The form is the page, for everyone.
 *
 * It used to be behind a "Sign in to contact support" wall, which asked for an
 * account before the visitor had written anything — and, worse, made the one
 * message that matters most impossible to send: someone who cannot sign in has
 * no way to tell us they cannot sign in. Now the ask comes after the message is
 * written, and it is a choice rather than a wall.
 */
function SupportPage() {
  const submitRequest = useMutation(api.support.submitRequest);
  // Convex-level auth, not just Clerk's: submitting the moment Clerk reports a
  // session races the token reaching Convex. Same reasoning as PredictionForm.
  const { isAuthenticated } = useConvexAuth();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<
    'bug' | 'question' | 'feedback' | ''
  >('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Set when a signed-out visitor presses send, revealing the two routes out. */
  const [needsIdentity, setNeedsIdentity] = useState(false);
  const autoSubmittedRef = useRef(false);

  async function send() {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await submitRequest({
        subject,
        message,
        category: category || undefined,
      });
      setSubject('');
      setCategory('');
      setMessage('');
      setNeedsIdentity(false);
      setSuccess(
        'Thanks for reaching out! Your message has been sent and will be reviewed soon.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to submit support request. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setNeedsIdentity(true);
      return;
    }
    void send();
  }

  /**
   * They already pressed send, so finishing sign-in is consent to send — asking
   * them to press it a second time would be asking twice for one decision.
   *
   * `/support` is not the landing page, so Clerk is already mounted here and the
   * modal never remounts this route: the typed message is still in state when
   * this fires.
   */
  useEffect(() => {
    if (
      !needsIdentity ||
      !isAuthenticated ||
      autoSubmittedRef.current ||
      !subject ||
      !message
    ) {
      return;
    }
    autoSubmittedRef.current = true;
    void send();
    // `send` closes over the current draft and is recreated each render; the ref
    // guard is what keeps this to a single submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsIdentity, isAuthenticated, subject, message]);

  /** Carries the typed message into a mail client, so nothing is retyped. */
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    category ? `[${category}] ${subject}` : subject,
  )}&body=${encodeURIComponent(message)}`;

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader
          eyebrow="Need Help?"
          title="Contact Support"
          subtitle="Found a bug, need help, or have feedback? Send a message directly to Barry."
        />

        <form
          onSubmit={handleSubmit}
          className="reveal-up reveal-delay-1 space-y-4 rounded-xl border border-border bg-surface p-4"
        >
          <div>
            <label
              htmlFor="support-subject"
              className="mb-1 block text-sm font-medium text-text"
            >
              Subject
            </label>
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
              placeholder="Short summary of your issue or question"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
          </div>

          <div>
            <span
              id="support-category-label"
              className="mb-1 block text-sm font-medium text-text"
            >
              Category (optional)
            </span>
            <div
              className="flex flex-wrap gap-2 text-xs"
              role="group"
              aria-labelledby="support-category-label"
            >
              {[
                { id: 'bug', label: 'Bug' },
                { id: 'question', label: 'Question' },
                { id: 'feedback', label: 'Feedback' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={category === option.id}
                  onClick={() =>
                    setCategory(
                      category === option.id
                        ? ''
                        : (option.id as typeof category),
                    )
                  }
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    category === option.id
                      ? 'bg-accent text-text-on-accent'
                      : 'bg-surface-muted text-text-muted hover:bg-surface'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="support-message"
              className="mb-1 block text-sm font-medium text-text"
            >
              Message
            </label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={6}
              maxLength={5000}
              placeholder="Describe what you were doing, what you expected to happen, and what actually happened. Include any relevant race, league, or user details."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-text-muted">
              Please avoid including sensitive personal information in your
              message.
            </p>
          </div>

          {error && (
            <p
              className="flex items-center gap-1 text-sm text-error"
              aria-live="assertive"
            >
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
          {success && (
            <p
              className="flex items-center gap-1 text-sm text-success"
              aria-live="polite"
            >
              <CheckIcon className="h-4 w-4" />
              <span>{success}</span>
            </p>
          )}

          {needsIdentity && !isAuthenticated ? (
            <div className="border-t border-border pt-4">
              {/* Two ways out, not a wall. Signing in attaches the message to an
                  account so the reply lands in the app; email works when the
                  account is exactly what is broken — which is the case a
                  sign-in wall silently made unreportable. */}
              <p className="text-sm font-medium text-text">
                Almost there. How should we reply?
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Signing in attaches this to your account so we can answer in
                context. If signing in is the problem, email it instead. Your
                message comes with you either way.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <AppSignInButton mode="modal">
                  <Button size="sm">Sign in and send</Button>
                </AppSignInButton>
                <Button asChild variant="secondary" size="sm" leftIcon={Mail}>
                  <a href={mailtoHref}>Email {SUPPORT_EMAIL}</a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                loading={isSubmitting}
                disabled={!subject || !message}
              >
                {isSubmitting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Send Message
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M9.00039 16.2002L4.80039 12.0002L3.40039 13.4002L9.00039 19.0002L21.0004 7.0002L19.6004 5.6002L9.00039 16.2002Z" />
    </svg>
  );
}
