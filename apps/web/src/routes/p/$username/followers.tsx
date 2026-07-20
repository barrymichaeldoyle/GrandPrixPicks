import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Users } from 'lucide-react';

import { PageLoader } from '@/components/PageLoader';
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
      signInTitle="Sign in to view followers"
      signInDescription={`Sign in to see who follows ${username} and discover other players.`}
      emptyMessage="No followers yet."
      icon={Users}
      isSignedIn={isSignedIn}
      profileExists={profile !== null}
      users={followers}
      viewerUserId={me?._id}
    />
  );
}
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
