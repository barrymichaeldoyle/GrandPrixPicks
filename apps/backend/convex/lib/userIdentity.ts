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
