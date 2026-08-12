import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { Users } from 'lucide-react';

import { PageLoader } from '@/components/PageLoader';
import { SignInPrompt } from '@/components/SignInPrompt';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { pageMeta } from '@/lib/site';
import { FollowListPage } from './-follow-list-page';

export const Route = createFileRoute('/p/$username/followers')({
  component: FollowersPage,
  loader: ({ params }) => ({ username: params.username }),
  head: ({ params }) =>
    pageMeta({
      title: `${params.username}'s followers | Grand Prix Picks`,
      description: `See who follows ${params.username} on Grand Prix Picks.`,
      path: `/p/${params.username}/followers`,
      noIndex: true,
    }),
});

function FollowersPage() {
  const { username } = Route.useParams();
  const { isSignedIn, isLoaded } = useViewerSession();

  const me = useQuery(api.users.me);
  const profile = useQuery(api.users.getProfileByUsername, { username });
  const followers = useQuery(
    api.follows.listFollowers,
    profile ? { userId: profile._id } : 'skip',
  );

  // Signed-out is resolved at SSR, so it renders before Clerk boots and before
  // the profile lookup, rather than behind two loaders.
  if (!isSignedIn) {
    return (
      <SignInPrompt
        eyebrow="Followers"
        title={`Who follows ${username}`}
        description="Following turns the global table into a race against people you actually know. Sign in to see who is backing whom."
        actionLabel="Sign in to see followers"
        behind={[
          'The full list of who follows this player',
          'Follow them back in one tap',
          'A leaderboard filtered to people you follow',
          'Their results in your activity feed',
        ]}
      />
    );
  }

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (profile === undefined || followers === undefined) {
    return <PageLoader />;
  }
  const displayName = profile?.displayName ?? profile?.username ?? username;

  return (
    <FollowListPage
      username={username}
      displayName={displayName}
      heading={`${displayName}'s followers`}
      emptyMessage="No followers yet."
      icon={Users}
      profileExists={profile !== null}
      users={followers}
      viewerUserId={me?._id}
    />
  );
}
