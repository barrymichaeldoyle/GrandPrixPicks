import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { UserPlus } from 'lucide-react';

import { PageLoader } from '@/components/PageLoader';
import { SignInPrompt } from '@/components/SignInPrompt';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { pageMeta } from '@/lib/site';
import { FollowListPage } from './-follow-list-page';

export const Route = createFileRoute('/p/$username/following')({
  component: FollowingPage,
  loader: ({ params }) => ({ username: params.username }),
  head: ({ params }) =>
    pageMeta({
      title: `Who ${params.username} follows | Grand Prix Picks`,
      description: `See who ${params.username} follows on Grand Prix Picks.`,
      path: `/p/${params.username}/following`,
      noIndex: true,
    }),
});

function FollowingPage() {
  const { username } = Route.useParams();
  const { isSignedIn, isLoaded } = useViewerSession();

  const me = useQuery(api.users.me);
  const profile = useQuery(api.users.getProfileByUsername, { username });
  const following = useQuery(
    api.follows.listFollowing,
    profile ? { userId: profile._id } : 'skip',
  );

  // Signed-out is resolved at SSR, so it renders before Clerk boots and before
  // the profile lookup, rather than behind two loaders.
  if (!isSignedIn) {
    return (
      <SignInPrompt
        eyebrow="Following"
        title={`Who ${username} follows`}
        description="Following turns the global table into a race against people you actually know. Sign in to see who this player is watching."
        actionLabel="Sign in to see who they follow"
        behind={[
          'Everyone this player follows',
          'Follow the same players in one tap',
          'A leaderboard filtered to people you follow',
          'Their results in your activity feed',
        ]}
      />
    );
  }

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (profile === undefined || following === undefined) {
    return <PageLoader />;
  }
  const displayName = profile?.displayName ?? profile?.username ?? username;

  return (
    <FollowListPage
      username={username}
      displayName={displayName}
      heading={`Who ${displayName} follows`}
      emptyMessage="Not following anyone yet."
      icon={UserPlus}
      profileExists={profile !== null}
      users={following}
      viewerUserId={me?._id}
    />
  );
}
