import { SignInButton, useAuth } from '@clerk/clerk-react';
import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { toUserFacingMessage } from '@/lib/userFacingError';

import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { PageLoader } from '../components/PageLoader';
import { canonicalMeta, defaultOgImage } from '../lib/site';

export const Route = createFileRoute('/support')({
  component: SupportPage,
  head: () => {
    const title = 'Support | Grand Prix Picks';
    const description =
      'Get help with Grand Prix Picks. Submit bugs, ask questions, or share feedback with the developer.';
    const canonical = canonicalMeta('/support');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: defaultOgImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: defaultOgImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function SupportPage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-accent" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              Sign in to contact support
            </h1>
            <p className="mx-auto mb-4 max-w-sm text-text-muted">
              You need to be signed in to submit a support request so we can
              associate it with your account.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  return <SupportContent />;
}

function SupportContent() {
  const submitRequest = useMutation(api.support.submitRequest);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<
    'bug' | 'question' | 'feedback' | ''
  >('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
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

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHero
          eyebrow="Need Help?"
          title="Contact Support"
          subtitle="Found a bug, need help, or have feedback? Send a message directly to Barry."
          icon={
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Mail className="h-5 w-5" />
            </span>
          }
        />

        <form
          onSubmit={(e) => void handleSubmit(e)}
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
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
                  onClick={() =>
                    setCategory(
                      category === option.id
                        ? ''
                        : (option.id as typeof category),
                    )
                  }
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    category === option.id
                      ? 'bg-accent text-white'
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
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
