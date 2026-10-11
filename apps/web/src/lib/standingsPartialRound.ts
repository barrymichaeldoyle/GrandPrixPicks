import { abbreviateGrandPrix } from '@/lib/display';

/*
 * Its own module, apart from `lib/standings.ts`, because the standings page's
 * `head` calls it and `head` ships in the client entry on every page:
 * importing it from there pulled ~2 kB of the standings helpers into the
 * entry and over its size budget.
 */

const COUNTED_SESSION_PROSE: Record<string, string> = {
  sprint: 'sprint',
  sprint_quali: 'sprint qualifying',
  quali: 'qualifying',
  race: 'race',
};

/**
 * "Singapore GP sprint" when the table already holds part of the next round,
 * which on a sprint weekend it does from Saturday until the Grand Prix.
 */
export function partialRoundLabel(standings: {
  nextRound: { name: string } | null;
  nextRoundCounted?: readonly string[];
}): string | null {
  const counted = standings.nextRoundCounted ?? [];
  if (!standings.nextRound || counted.length === 0) {
    return null;
  }
  const sessions = counted
    .map((session) => COUNTED_SESSION_PROSE[session] ?? session)
    .join(' and ');
  return `${abbreviateGrandPrix(standings.nextRound.name)} ${sessions}`;
}
