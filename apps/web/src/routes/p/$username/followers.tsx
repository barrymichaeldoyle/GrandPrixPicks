import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Users } from 'lucide-react';

import { PageLoader } from '../../../components/PageLoader';
import { canonicalMeta, defaultOgImage, noIndexMeta } from '../../../lib/site';
import { FollowListPage } from './-follow-list-page';

export const Route = createFileRoute('/p/$username/followers')({
  component: FollowersPage,
  loader: ({ params }) => ({ username: params.username }),
  head: ({ params }) => {
    const title = `${params.username}'s followers | Grand Prix Picks`;
    const description = `See who follows ${params.username} on Grand Prix Picks.`;
    const canonical = canonicalMeta(`/p/${params.username}/followers`);
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: defaultOgImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: defaultOgImage },
        ...noIndexMeta(),
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function FollowersPage() {
  const { username } = Route.useParams();
  const { isSignedIn, isLoaded } = useAuth();

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
