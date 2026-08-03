import type {
  ReactionCounts,
  ReactionType,
} from '@grandprixpicks/shared/reactions';
import {
  DEFAULT_REACTION_TYPE,
  emptyReactionCounts,
  normalizeReactionCounts,
} from '@grandprixpicks/shared/reactions';
import { v } from 'convex/values';

export const reactionTypeValidator = v.union(
  v.literal('fire'),
  v.literal('nice'),
  v.literal('wow'),
  v.literal('funny'),
  v.literal('oof'),
);

export const reactionCountsValidator = v.object({
  fire: v.number(),
  nice: v.number(),
  wow: v.number(),
  funny: v.number(),
  oof: v.number(),
});

export { DEFAULT_REACTION_TYPE, emptyReactionCounts, normalizeReactionCounts };
export type { ReactionCounts, ReactionType };

export function changeReactionCount(
  current: Partial<ReactionCounts> | undefined,
  legacyTotal: number,
  reactionType: ReactionType,
  delta: 1 | -1,
): ReactionCounts {
  const counts = normalizeReactionCounts(current, legacyTotal);
  return {
    ...counts,
    [reactionType]: Math.max(0, counts[reactionType] + delta),
  };
}
