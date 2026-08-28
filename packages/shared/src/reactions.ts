export const REACTION_TYPES = ['fire', 'nice', 'wow', 'funny', 'oof'] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export type ReactionCounts = Record<ReactionType, number>;

export const DEFAULT_REACTION_TYPE: ReactionType = 'fire';

export const REACTION_OPTIONS: ReadonlyArray<{
  type: ReactionType;
  emoji: string;
  label: string;
}> = [
  { type: 'fire', emoji: '🔥', label: 'Great pick' },
  { type: 'nice', emoji: '👏', label: 'Nice one' },
  { type: 'wow', emoji: '🤯', label: 'Wow' },
  { type: 'funny', emoji: '😂', label: 'Funny' },
  { type: 'oof', emoji: '🫣', label: 'Oof' },
];

/**
 * Where a reaction is being offered.
 *
 * The stored type never changes with context, only how it is presented. A
 * `fire` on a score card means "great pick", which is the right words there and
 * plainly wrong under a news story: there is no pick in a grid penalty to call
 * great. Relabelling globally would break the score cards, where those words
 * are exactly right, so the label travels with the surface instead.
 */
export type ReactionContext = 'pick' | 'news';

/**
 * Only `fire` is overridden. The others survive the move intact: a piece of
 * news can be surprising, funny or bad for somebody, so "Wow", "Funny" and
 * "Oof" all still mean what they say. Rewording them too would be churn for
 * its own sake.
 */
const NEWS_OVERRIDES: Partial<
  Record<ReactionType, { emoji: string; label: string }>
> = {
  fire: { emoji: '🌶️', label: 'Spicy' },
};

export function reactionOptionsFor(
  context: ReactionContext,
): ReadonlyArray<{ type: ReactionType; emoji: string; label: string }> {
  if (context === 'pick') {
    return REACTION_OPTIONS;
  }
  return REACTION_OPTIONS.map((option) => ({
    ...option,
    ...(NEWS_OVERRIDES[option.type] ?? {}),
  }));
}

export const REACTION_BY_TYPE = Object.fromEntries(
  REACTION_OPTIONS.map((reaction) => [reaction.type, reaction]),
) as Record<ReactionType, (typeof REACTION_OPTIONS)[number]>;

export function emptyReactionCounts(): ReactionCounts {
  return {
    fire: 0,
    nice: 0,
    wow: 0,
    funny: 0,
    oof: 0,
  };
}

export function normalizeReactionCounts(
  counts: Partial<ReactionCounts> | undefined,
  legacyTotal = 0,
): ReactionCounts {
  if (!counts) {
    return {
      ...emptyReactionCounts(),
      fire: legacyTotal,
    };
  }

  return {
    fire: counts.fire ?? 0,
    nice: counts.nice ?? 0,
    wow: counts.wow ?? 0,
    funny: counts.funny ?? 0,
    oof: counts.oof ?? 0,
  };
}
