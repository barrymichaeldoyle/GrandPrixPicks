import { api } from '@convex-generated/api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';

import { Button } from '@/components/Button/Button';
import { NoticeCard } from '@/components/NoticeCard';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { PageLoader } from '@/components/PageLoader';
import { SignInPrompt } from '@/components/SignInPrompt';
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

  // Signed-out is resolved at SSR, so it renders before Clerk boots rather
  // than behind the loader.
  if (!isSignedIn) {
    return (
      <SignInPrompt
        eyebrow="Profile"
        title="Your season, on the record"
        description="Every pick you have made this year, what it scored, and where it puts you against everyone else."
        actionLabel="Sign in to see your profile"
        behind={[
          'Season points and championship position',
          'Pick history for every session',
          'Head-to-head record against team-mates',
          'Followers, and the players you follow',
        ]}
      />
    );
  }

  if (!isLoaded) {
    return <PageLoader />;
  }

  // Signed in but no username — can't redirect to profile
  if (me && !me.username) {
    return (
      <div className="bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <NoticeCard
            level="page"
            title="Set a Username"
            description="You need a username to view your predictions."
            action={
              <Button
                size="sm"
                onClick={() => void navigate({ to: '/settings' })}
              >
                Go to Settings
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Signed in, waiting for me query or redirect
  return <PageLoader />;
}
