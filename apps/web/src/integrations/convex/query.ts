/**
 * Convex read hooks that survive a route change.
 *
 * `convex/react`'s own `useQuery` drops its subscription the moment the last
 * component reading it unmounts, so every navigation is a cold start: leave
 * Notifications for Leagues, come back, and the page paints `undefined`
 * again — skeleton, then the same rows that were on screen a second earlier.
 * Nothing about that data changed in the meantime; the client simply threw it
 * away and asked for it again.
 *
 * These are the `convex-helpers` cache-backed versions. They hold the
 * subscription open for a while after the last reader unmounts, so a return
 * trip renders synchronously from the value the client still has, and stays
 * live off the same socket the whole time. There is no stale window: an
 * unmounted-but-cached query is still subscribed, so anything that changed
 * while the reader was away has already been applied.
 *
 * Read hooks come from here; `useMutation`, `useAction` and the auth hooks
 * still come from `convex/react`. `useQueries` has a cached version too, but
 * nothing reads it yet and an unused re-export fails `knip` — re-export it
 * here the first time something needs it, rather than importing it directly.
 */
export {
  usePaginatedQuery,
  useQuery,
} from 'convex-helpers/react/cache/hooks';
