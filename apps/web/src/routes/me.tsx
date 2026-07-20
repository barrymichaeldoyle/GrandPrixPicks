import { api } from '@convex-generated/api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { LogIn } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/Button/Button';
import { AppSignInButton } from '@/integrations/clerk/sign-in-button';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { PageLoader } from '@/components/PageLoader';
import { pageMeta } from '@/lib/site';

export const Route = createFileRoute('/me')({
  component: MyPredictionsPage,
  head: () =>
    pageMeta({
      title: 'My Predictions | Grand Prix Picks',
      description:
        'View your F1 prediction history and track your scores across the 2026 season.',
      path: '/me',
      noIndex: true,
    }),
});

function MyPredictionsPage() {
  const { isSignedIn, isLoaded } = useViewerSession();
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const navigate = useNavigate();

  useEffect(() => {
    if (me?.username) {
      void navigate({
        to: '/p/$username',
        params: { username: me.username },
        search: { from: undefined, fromLabel: undefined },
        replace: true,
      });
    }
  }, [me?.username, navigate]);

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              Sign In Required
            </h1>
            <p className="mb-4 text-text-muted">
              Sign in to view your prediction history.
            </p>
            <AppSignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </AppSignInButton>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but no username — can't redirect to profile
  if (me && !me.username) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-text">
              Set a Username
            </h1>
            <p className="mb-4 text-text-muted">
              You need a username to view your predictions.
            </p>
            <Button
              size="sm"
              onClick={() => void navigate({ to: '/settings' })}
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Signed in, waiting for me query or redirect
  return <PageLoader />;
}
