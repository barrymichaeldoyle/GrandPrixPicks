/**
 * How a user is labelled when they have no username yet (`users.username` is
 * optional in the schema, so this is reachable, not defensive).
 *
 * This exists because the same condition used to render three different ways:
 * feed rows said "Unknown", profiles and follow lists said "Anonymous", and
 * whether you saw either depended on which Convex function had applied its own
 * fallback before the data reached the client.
 *
 * Sentence-embedded copy is deliberately NOT covered here. The notification
 * bell says "Someone revved your pick", which reads better than "Anonymous
 * revved your pick"; keep that local to the sentence that needs it.
 */
export const ANONYMOUS_NAME = 'Anonymous';

/** The name to show for a user in lists, leaderboards, cards and headings. */
export function resolveDisplayName(user: {
  displayName?: string | null;
  username?: string | null;
}): string {
  return user.displayName ?? user.username ?? ANONYMOUS_NAME;
}
