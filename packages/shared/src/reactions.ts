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
