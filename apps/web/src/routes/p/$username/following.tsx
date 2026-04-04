import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { UserPlus } from 'lucide-react';

import { PageLoader } from '../../../components/PageLoader';
import { canonicalMeta, defaultOgImage, noIndexMeta } from '../../../lib/site';
import { FollowListPage } from './-follow-list-page';

export const Route = createFileRoute('/p/$username/following')({
  component: FollowingPage,
  loader: ({ params }) => ({ username: params.username }),
  head: ({ params }) => {
    const title = `Who ${params.username} follows | Grand Prix Picks`;
    const description = `See who ${params.username} follows on Grand Prix Picks.`;
    const canonical = canonicalMeta(`/p/${params.username}/following`);
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
