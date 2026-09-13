/**
 * The suggested-follows "why" line, shared by web and mobile.
 *
 * Deliberately free of Convex types, like `practice.ts`: both apps generate
 * their own `api`, so the input is declared structurally and each caller
 * passes its own row from `follows.getSuggestedLeagueMembersToFollow`.
 */
export type FollowSuggestionReason = {
  mutualFollowerCount: number;
  mutualFollowers: Array<{ displayName: string }>;
  sharedLeagueNames: string[];
  sharedLeagueCount: number;
};

/**
 * Says why this person is worth following, strongest reason first.
 *
 * "Two people you follow follow them" beats "you are both in a league", so
 * mutuals win the line when there are any — and the backend ranks the whole
 * list that way too. Names are spelled out up to the point where they stop
 * being recognisable and start being a list.
 */
export function reasonText(user: FollowSuggestionReason): string {
  const { mutualFollowerCount, mutualFollowers } = user;

  if (mutualFollowerCount > 0) {
    const named = mutualFollowers.map((mutual) => mutual.displayName);
    const unnamed = mutualFollowerCount - named.length;

    if (named.length === 0) {
      return `Followed by ${mutualFollowerCount} ${mutualFollowerCount === 1 ? 'player' : 'players'} you follow`;
    }
    if (unnamed > 0) {
      return `Followed by ${named[0]} and ${mutualFollowerCount - 1} others you follow`;
    }
    if (named.length === 1) {
      return `Followed by ${named[0]}`;
    }
    return `Followed by ${named.slice(0, -1).join(', ')} and ${named.at(-1)}`;
  }

  if (user.sharedLeagueNames.length > 0) {
    return `In ${user.sharedLeagueNames.join(' and ')}`;
  }
  return `In ${user.sharedLeagueCount} leagues with you`;
}
