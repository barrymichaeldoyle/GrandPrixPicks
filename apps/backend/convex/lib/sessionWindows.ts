import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

const sessionIndexes = {
  fp1: ['by_fp1StartAt', 'fp1StartAt'],
  fp2: ['by_fp2StartAt', 'fp2StartAt'],
  fp3: ['by_fp3StartAt', 'fp3StartAt'],
  quali: ['by_qualiStartAt', 'qualiStartAt'],
  sprint_quali: ['by_sprintQualiStartAt', 'sprintQualiStartAt'],
} as const;

/** Read only races with a session in this window, including rescheduled sessions. */
export async function loadRacesInSessionWindow(
  ctx: QueryCtx,
  sessions: ReadonlyArray<keyof typeof sessionIndexes>,
  from: number,
  through: number,
): Promise<Array<Doc<'races'>>> {
  const groups = await Promise.all(
    sessions.map((session) => {
      const [index, field] = sessionIndexes[session];
      return ctx.db
        .query('races')
        .withIndex(index, (q) => q.gte(field, from).lte(field, through))
        .take(30);
    }),
  );
  const races = new Map(groups.flat().map((race) => [race._id, race]));
  return [...races.values()].sort(
    (a, b) =>
      b.season - a.season ||
      b.round - a.round ||
      b._creationTime - a._creationTime,
  );
}
