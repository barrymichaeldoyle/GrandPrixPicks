import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { UserPlus } from 'lucide-react';

import { PageLoader } from '@/components/PageLoader';
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
  const { isSignedIn, isLoaded } = useAuth();

  const me = useQuery(api.users.me);
  const profile = useQuery(api.users.getProfileByUsername, { username });
  const following = useQuery(
    api.follows.listFollowing,
    profile ? { userId: profile._id } : 'skip',
  );

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
      signInTitle="Sign in to view following"
      signInDescription={`Sign in to see who ${username} follows and discover other players.`}
      emptyMessage="Not following anyone yet."
      icon={UserPlus}
      isSignedIn={isSignedIn}
      profileExists={profile !== null}
      users={following}
      viewerUserId={me?._id}
    />
  );
}
