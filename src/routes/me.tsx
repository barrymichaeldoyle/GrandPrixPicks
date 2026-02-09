import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { LogIn } from 'lucide-react';
import { useEffect } from 'react';

import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { PageLoader } from '../components/PageLoader';
import { ogBaseUrl } from '../lib/site';

export const Route = createFileRoute('/me')({
  component: MyPredictionsPage,
  head: () => ({
    meta: [
      { title: 'My Predictions | Grand Prix Picks' },
      {
        name: 'description',
        content:
          'View your F1 prediction history and track your scores across the 2026 season.',
      },
      { property: 'og:image', content: `${ogBaseUrl}/og/home.png` },
      { name: 'twitter:image', content: `${ogBaseUrl}/og/home.png` },
    ],
  }),
});

function MyPredictionsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const navigate = useNavigate();

  useEffect(() => {
    if (me?.username) {
      void navigate({
        to: '/p/$username',
        params: { username: me.username },
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
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              Sign In Required
            </h1>
            <p className="mb-4 text-text-muted">
              Sign in to view your prediction history.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but no username — can't redirect to profile
  if (me && !me.username) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-4xl px-4 py-8">
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
