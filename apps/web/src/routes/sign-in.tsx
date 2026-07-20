import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/Button/Button';
import { useClerkRuntimeControl } from '@/integrations/clerk/runtime-control';
import { AppSignInButton } from '@/integrations/clerk/sign-in-button';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { pageMeta } from '@/lib/site';

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
  head: () =>
    pageMeta({
      title: 'Sign In | Grand Prix Picks',
      description: 'Sign in to Grand Prix Picks.',
      path: '/sign-in',
      noIndex: true,
    }),
});

function SignInPage() {
  const runtime = useClerkRuntimeControl();
  const { confirmedSignedIn } = useViewerSession();
  const navigate = useNavigate();
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) {
      return;
    }
    hasRequested.current = true;
    runtime.requestSignIn();
  }, [runtime]);

  useEffect(() => {
    if (confirmedSignedIn) {
      void navigate({ to: '/' });
    }
  }, [confirmedSignedIn, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-text">Sign in</h1>
        <p className="mb-6 text-text-muted">
          Sign in to make picks, join leagues, and track your results.
        </p>
        <div className="flex flex-col items-center gap-3">
          <AppSignInButton mode="modal">
            <Button size="sm">Continue to sign in</Button>
          </AppSignInButton>
          <Link to="/" className="text-sm text-text-muted hover:text-text">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
