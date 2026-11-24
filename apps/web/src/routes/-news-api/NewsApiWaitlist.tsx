import { api } from '@convex-generated/api';
import { useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';

const FAILED = 'You weren’t added to the list. Try again.';

const fieldClass =
  'w-full rounded-sm border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none';

/**
 * The waiting list on `/f1-news-api` (`docs/news-api.md`). No account: the
 * people this is for are developers who have never played, and the address is
 * all the list needs. `newsApi.joinWaitlist` is rate-limited for that reason.
 */
export function NewsApiWaitlist() {
  const joinWaitlist = useMutation(api.newsApi.joinWaitlist);
  /** The address that joined, for the confirmation line. */
  const [joinedEmail, setJoinedEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The fields are read from the form on submit, not held in state. An
  // address the browser autofills, or one typed before the page hydrates,
  // never fires a change event, and a button waiting on state stayed disabled.
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const useCase = String(data.get('useCase') ?? '').trim();
    const chosen = data.get('use');
    const use =
      chosen === 'personal' || chosen === 'commercial' ? chosen : undefined;
    if (!email || isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await joinWaitlist({ email, useCase: useCase || undefined, use });
      captureAnalyticsEvent('news_api_waitlist_joined', {
        has_use_case: useCase.length > 0,
        use,
      });
      setJoinedEmail(email);
    } catch (err) {
      // An expected refusal carries its own sentence; anything else is ours.
      setError(
        err instanceof ConvexError && typeof err.data === 'string'
          ? err.data
          : FAILED,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (joinedEmail !== null) {
    return (
      <p className="mt-3 text-text" aria-live="polite">
        {joinedEmail} is on the list.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 max-w-xl space-y-3">
      <div>
        <label
          htmlFor="news-api-email"
          className="mb-1 block text-sm font-medium text-text"
        >
          Email
        </label>
        <input
          id="news-api-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          name="email"
          className={fieldClass}
        />
      </div>
      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-text">
          What it’s for (optional)
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text">
          {(
            [
              ['personal', 'A personal project'],
              ['commercial', 'A product that earns money'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="inline-flex min-h-6 items-center gap-2 pointer-coarse:min-h-11"
            >
              <input
                type="radio"
                name="use"
                value={value}
                className="accent-accent"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label
          htmlFor="news-api-use-case"
          className="mb-1 block text-sm font-medium text-text"
        >
          What you’d build with it (optional)
        </label>
        <textarea
          id="news-api-use-case"
          rows={3}
          maxLength={1000}
          name="useCase"
          className={`${fieldClass} resize-y`}
        />
      </div>
      {error && (
        <p className="text-sm text-error" aria-live="assertive">
          {error}
        </p>
      )}
      <Button type="submit" loading={isSubmitting}>
        Join the waiting list
      </Button>
    </form>
  );
}
