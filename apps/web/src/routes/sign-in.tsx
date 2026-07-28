import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/Button/Button';
import { useClerkRuntimeControl } from '@/integrations/clerk/runtime-control';
import { AppSignInButton } from '@/integrations/clerk/sign-in-button';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { pageMeta } from '@/lib/site';
import { NoticeCard } from '@/components/NoticeCard';

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
      <NoticeCard
        level="page"
        className="w-full max-w-md"
        title="Sign in"
        description="Sign in to make picks, join leagues, and track your results."
        action={
          <div className="flex flex-col items-center gap-3">
            <AppSignInButton mode="modal">
              <Button size="sm">Continue to sign in</Button>
            </AppSignInButton>
            <Link to="/" className="text-sm text-text-muted hover:text-text">
              Back to home
            </Link>
          </div>
        }
      />
    </div>
  );
}
