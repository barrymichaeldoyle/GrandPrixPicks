import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { PageHeader } from '@/components/PageHeader';
import { PageLoader } from '@/components/PageLoader';
import { SignInPrompt } from '@/components/SignInPrompt';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { useQuery } from '@/integrations/convex/query';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { formatUtcDate } from '@/lib/date';
import { pageMeta, siteConfig } from '@/lib/site';
import { useNow } from '@/lib/testing/now';
import { toUserFacingMessage } from '@/lib/userFacingError';

/**
 * Self-serve news API keys (`docs/news-api.md`, `newsApiAccount.ts`): any
 * signed-in account creates and revokes its own free-plan keys here. Paid
 * plans are still issued by the operator.
 *
 * `f1-news-api_` keeps it out of the landing page's layout. An account tool,
 * not content: noindex, out of the sitemap, and linked only from
 * `/f1-news-api`. Not Clerk-free (`clerk-free-routes.ts`): it reads
 * viewer-scoped data.
 */
export const Route = createFileRoute('/f1-news-api_/keys')({
  component: NewsApiKeysPage,
  head: () =>
    pageMeta({
      title: 'News API keys | Grand Prix Picks',
      description: 'Create and revoke your F1 news API keys.',
      path: '/f1-news-api/keys',
      noIndex: true,
    }),
});

/** Mirrors `MAX_ACTIVE_KEYS` in `newsApiAccount.ts`, which enforces it. */
const MAX_ACTIVE_KEYS = 2;

const OPENAPI_PATH = '/api/v1/openapi.json';

const PLAN_NAMES = {
  free: 'Free',
  hobby: 'Hobby',
  commercial: 'Commercial',
} as const;

const FREE_TERMS = [
  '10 requests a minute',
  'Stories appear a day after they are published',
  'Show a link to Grand Prix Picks wherever you show the stories',
];

const CREATE_FAILED = 'The key wasn’t created. Try again.';
const REVOKE_FAILED = 'The key wasn’t revoked. Try again.';

const fieldClass =
  'w-full rounded-sm border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none';
const codeClass =
  'gpp-mono overflow-x-auto rounded-md border border-border bg-surface p-4 text-xs leading-relaxed text-text';
const quietLinkClass =
  'text-text underline decoration-border-strong underline-offset-4 hover:decoration-text';

function NewsApiKeysPage() {
  const { isSignedIn, isLoaded } = useViewerSession();

  // Signed-out is resolved at SSR, so it renders before Clerk boots rather
  // than behind the loader.
  if (!isSignedIn) {
    return (
      <SignInPrompt
        eyebrow="F1 news API"
        title="News API keys"
        description="Create a free key for the F1 news API with your Grand Prix Picks account."
        actionLabel="Sign in to get a key"
        behind={[
          `Up to ${MAX_ACTIVE_KEYS} free keys`,
          'Requests each key made today',
          'Revoke a key',
        ]}
        alternative={{ to: '/f1-news-api', label: 'About the F1 news API' }}
      />
    );
  }

  if (!isLoaded) {
    return <PageLoader />;
  }

  return <NewsApiKeysContent />;
}

type CreatedKey = { key: string; label: string };

function NewsApiKeysContent() {
  const keys = useQuery(api.newsApiAccount.myKeys, {});
  const createMyKey = useMutation(api.newsApiAccount.createMyKey);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCount = keys?.filter((key) => key.revokedAt === null).length ?? 0;
  const atLimit = activeCount >= MAX_ACTIVE_KEYS;

  // The label is read from the form on submit, as `NewsApiWaitlist` does, so
  // a value typed before hydration still counts.
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const label = String(new FormData(form).get('label') ?? '').trim();
    if (!label || isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createMyKey({ label });
      captureAnalyticsEvent('news_api_key_created', { plan: result.plan });
      setCreated({ key: result.key, label: result.label });
      form.reset();
    } catch (err) {
      setError(toUserFacingMessage(err, CREATE_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <PageHeader title="News API keys" />

        <section aria-labelledby="free-plan" className="mt-6">
          <h2 id="free-plan" className="text-base font-semibold text-text">
            Free plan
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-text-muted">
            {FREE_TERMS.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href={OPENAPI_PATH} className={quietLinkClass}>
              OpenAPI document
            </a>
            <Link to="/f1-news-api" className={quietLinkClass}>
              About the F1 news API
            </Link>
          </p>
        </section>

        {created ? (
          <NewKeyPanel created={created} onDone={() => setCreated(null)} />
        ) : null}

        <section aria-labelledby="create-key" className="mt-8">
          <h2 id="create-key" className="text-base font-semibold text-text">
            Create a key
          </h2>
          {atLimit ? (
            <p className="mt-2 text-sm text-text-muted">
              You have {MAX_ACTIVE_KEYS} active keys. Revoke one to create
              another.
            </p>
          ) : (
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="news-api-key-label"
                  className="mb-1 block text-sm font-medium text-text"
                >
                  Name
                </label>
                <input
                  id="news-api-key-label"
                  name="label"
                  type="text"
                  required
                  maxLength={60}
                  autoComplete="off"
                  placeholder="Discord bot"
                  className={fieldClass}
                />
              </div>
              <Button type="submit" size="sm" loading={isSubmitting}>
                Create key
              </Button>
            </form>
          )}
          {error ? (
            <p className="mt-2 text-sm text-error" aria-live="assertive">
              {error}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="your-keys" className="mt-8">
          <h2 id="your-keys" className="text-base font-semibold text-text">
            Your keys
          </h2>
          {keys === undefined ? (
            <p className="mt-2 text-sm text-text-muted">Loading keys…</p>
          ) : keys.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">No keys yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {keys.map((key) => (
                <KeyRow key={key.id} apiKey={key} />
              ))}
            </ul>
          )}
        </section>

        <Button
          asChild
          size="sm"
          variant="text"
          leftIcon={ArrowLeft}
          className="mt-8 !px-0"
        >
          <Link to="/f1-news-api">Back to the F1 news API</Link>
        </Button>
      </div>
    </div>
  );
}

function NewKeyPanel({
  created,
  onDone,
}: {
  created: CreatedKey;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const curl = `curl "${siteConfig.url}/api/v1/news?limit=5" \\
  -H "Authorization: Bearer ${created.key}"`;

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused: the key is still on screen to select by hand.
    }
  }

  return (
    <section
      aria-labelledby="new-key"
      className="mt-8 rounded-md border border-border-strong p-4"
    >
      <h2 id="new-key" className="text-base font-semibold text-text">
        {created.label}
      </h2>
      <p className="mt-1 text-sm text-text-muted" aria-live="polite">
        Copy this key now. It won’t be shown again.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className={`${codeClass} min-w-0 flex-1 break-all`}>
          {created.key}
        </code>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void copyKey()}
        >
          {copied ? 'Copied' : 'Copy key'}
        </Button>
      </div>
      <pre className={`${codeClass} mt-3`}>
        <code>{curl}</code>
      </pre>
      <Button
        type="button"
        size="sm"
        variant="text"
        onClick={onDone}
        className="mt-3 !px-0"
      >
        Done
      </Button>
    </section>
  );
}

type KeyRowData = {
  id: Id<'newsApiKeys'>;
  label: string;
  prefix: string;
  plan: keyof typeof PLAN_NAMES;
  createdAt: number;
  revokedAt: number | null;
  usage: { day: string; requests: number } | null;
};

function KeyRow({ apiKey }: { apiKey: KeyRowData }) {
  const revokeMyKey = useMutation(api.newsApiAccount.revokeMyKey);
  const [confirming, setConfirming] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(60_000);
  const today = new Date(now).toISOString().slice(0, 10);
  const requestsToday = apiKey.usage?.day === today ? apiKey.usage.requests : 0;
  const revoked = apiKey.revokedAt !== null;

  async function revoke() {
    setError(null);
    setIsRevoking(true);
    try {
      await revokeMyKey({ id: apiKey.id });
      setConfirming(false);
    } catch (err) {
      setError(toUserFacingMessage(err, REVOKE_FAILED));
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p
            className={`text-sm font-medium break-words ${revoked ? 'text-text-muted' : 'text-text'}`}
          >
            {apiKey.label}
          </p>
          <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            <div>
              <dt className="sr-only">Key</dt>
              <dd className="gpp-mono">{apiKey.prefix}…</dd>
            </div>
            <div>
              <dt className="sr-only">Plan</dt>
              <dd>{PLAN_NAMES[apiKey.plan]}</dd>
            </div>
            <div>
              <dt className="sr-only">Created</dt>
              <dd>Created {formatUtcDate(apiKey.createdAt)}</dd>
            </div>
            {revoked ? (
              <div>
                <dt className="sr-only">Revoked</dt>
                <dd>Revoked {formatUtcDate(apiKey.revokedAt!)}</dd>
              </div>
            ) : (
              <div>
                <dt className="sr-only">Requests today</dt>
                <dd>
                  {requestsToday === 1
                    ? '1 request today'
                    : `${requestsToday.toLocaleString('en-GB')} requests today`}
                </dd>
              </div>
            )}
          </dl>
        </div>
        {revoked ? null : confirming ? null : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setConfirming(true)}
          >
            Revoke
          </Button>
        )}
      </div>
      {confirming && !revoked ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-sm text-text">
            Anything using this key stops working at once. You can’t undo it.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="danger"
              loading={isRevoking}
              onClick={() => void revoke()}
            >
              Revoke key
            </Button>
            <Button
              type="button"
              size="sm"
              variant="text"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-error" aria-live="assertive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
