/**
 * Convex read hooks that survive a screen change.
 *
 * Mirrors `apps/web/src/integrations/convex/query.ts`, for the same reason.
 * `convex/react`'s `useQuery` drops its subscription when the last reader
 * unmounts, and a native stack unmounts a screen the moment it is popped. Open
 * a race, go back, open it again and the screen starts from `undefined` even
 * though nothing about the race changed in between.
 *
 * These cache-backed versions hold the subscription for a few minutes after
 * the last reader leaves, so a screen pushed a second time renders from the
 * value the client still has and keeps updating live. Tab screens stay mounted
 * and were never affected; this is for the pushed ones.
 *
 * Read hooks come from here; `useMutation`, `useConvex` and the auth hooks
 * still come from `convex/react`.
 */
export { usePaginatedQuery, useQuery } from 'convex-helpers/react/cache/hooks';
