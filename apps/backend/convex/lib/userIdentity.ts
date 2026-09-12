/**
 * The three fields every surface needs to render a person: who they are, what
 * to call them, and their picture.
 *
 * This projection was rebuilt inline 25 times across feed, leaderboards,
 * follows, results and users. The sources differ - a `users` document, an
 * optional lookup that may be null, or a denormalised standings row that
 * already carries the fields - so the parameter is structural rather than
 * `Doc<'users'>`.
 *
 * Endpoints that need a display fallback should apply `ANONYMOUS_NAME` on top
 * rather than baking it in here: several deliberately return the raw values and
 * let the client decide.
 */
export type UserIdentity = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

/**
 * Note the return is always optional-valued. A call site that has guarded its
 * source into non-optional fields (see `follows.suggestions`) must keep the
 * projection inline: TypeScript narrows the property expression, not the
 * object, so the narrowing is lost the moment `source` crosses into a function.
 */
export function toUserIdentity(
  source: UserIdentity | null | undefined,
): UserIdentity {
  return {
    username: source?.username,
    displayName: source?.displayName,
    avatarUrl: source?.avatarUrl,
  };
}

/**
 * Drops `displayName` from a leaderboard entry, leaving `username` as the only
 * name in the payload.
 *
 * A username is chosen for this site and is already the public handle in the
 * profile URL. A display name arrives from whatever the Clerk account was
 * called, which for an OAuth sign-up is a legal name nobody typed here —
 * publishing that to an indexable page is not a choice the account holder made.
 *
 * It strips rather than substitutes so the real name never reaches the client
 * at all. Rendering `username` while still shipping `displayName` in the SSR
 * payload would move the name out of sight without taking it off the page.
 *
 * Apply at the return boundary of a public query when there is no viewer.
 * Signed-in boards use {@link toBoardEntry}. League and friends boards skip
 * this entirely: those queries already require a viewer, and they keep the
 * familiar name.
 */
export function toPublicEntry<T extends { displayName?: string }>(
  entry: T,
): Omit<T, 'displayName'> {
  const { displayName: _withheld, ...rest } = entry;
  return rest;
}

/**
 * The name a public board is allowed to show this viewer.
 *
 * Unsigned responses stay usernames-only. Once someone is signed in, the same
 * board can show the display name they already see on league and following
 * lists. A missing display name still strips, so the client never has to tell
 * `undefined` from "withheld".
 */
export function toBoardEntry<T extends { displayName?: string }>(
  entry: T,
  viewer: unknown,
): Omit<T, 'displayName'> & { displayName?: string } {
  if (viewer && entry.displayName) {
    return entry;
  }
  return toPublicEntry(entry);
}
