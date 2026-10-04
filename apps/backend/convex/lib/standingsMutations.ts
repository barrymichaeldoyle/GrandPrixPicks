import {
  customCtx,
  customMutation,
} from 'convex-helpers/server/customFunctions';
import { Triggers } from 'convex-helpers/server/triggers';

import { internal } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';
import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
  type MutationCtx,
} from '../_generated/server';

/** Use for mutations that write races, results, drivers, or team stints. */
export function withStandingsInvalidation(ctx: MutationCtx): MutationCtx {
  // These sets belong to this transaction, never to a shared module instance.
  const invalidated = new Set<number>();
  let invalidatedRoster = false;
  const triggers = new Triggers<DataModel>();

  async function invalidate(source: MutationCtx, season: number) {
    if (invalidated.has(season)) {
      return;
    }
    invalidated.add(season);
    const cached = await source.db
      .query('constructorPointsCache')
      .withIndex('by_season', (q) => q.eq('season', season))
      .unique();
    if (cached) {
      await source.db.delete('constructorPointsCache', cached._id);
    }
    await source.scheduler.runAfter(
      0,
      internal.constructorPointsCache.rebuild,
      { season },
    );
  }

  triggers.register('results', async (source, { oldDoc, newDoc }) => {
    function inputs(doc: typeof oldDoc) {
      return (
        doc && {
          raceId: doc.raceId,
          sessionType: doc.sessionType,
          classification: doc.classification,
          dnfDriverIds: doc.dnfDriverIds ?? [],
        }
      );
    }
    if (JSON.stringify(inputs(oldDoc)) === JSON.stringify(inputs(newDoc))) {
      return;
    }
    for (const doc of [oldDoc, newDoc]) {
      if (
        !doc ||
        (doc.sessionType !== 'race' && doc.sessionType !== 'sprint')
      ) {
        continue;
      }
      const race = await source.db.get('races', doc.raceId);
      if (race) {
        await invalidate(source, race.season);
      }
    }
  });

  triggers.register('races', async (source, { oldDoc, newDoc }) => {
    function inputs(doc: typeof oldDoc) {
      return (
        doc && {
          season: doc.season,
          round: doc.round,
          cancelled: doc.status === 'cancelled',
        }
      );
    }
    if (JSON.stringify(inputs(oldDoc)) === JSON.stringify(inputs(newDoc))) {
      return;
    }
    for (const doc of [oldDoc, newDoc]) {
      if (doc) {
        await invalidate(source, doc.season);
      }
    }
  });

  triggers.register('driverTeamStints', async (source, { oldDoc, newDoc }) => {
    function inputs(doc: typeof oldDoc) {
      return (
        doc && {
          driverId: doc.driverId,
          season: doc.season,
          team: doc.team,
          fromRound: doc.fromRound,
          toRound: doc.toRound,
        }
      );
    }
    if (JSON.stringify(inputs(oldDoc)) === JSON.stringify(inputs(newDoc))) {
      return;
    }
    for (const doc of [oldDoc, newDoc]) {
      if (doc) {
        await invalidate(source, doc.season);
      }
    }
  });

  triggers.register('drivers', async (source, { oldDoc, newDoc }) => {
    // displayName changes can change the bounded roster query's membership.
    if (
      oldDoc &&
      newDoc &&
      oldDoc.team === newDoc.team &&
      oldDoc.displayName === newDoc.displayName
    ) {
      return;
    }
    if (invalidatedRoster) {
      return;
    }
    invalidatedRoster = true;
    for await (const cached of source.db.query('constructorPointsCache')) {
      await invalidate(source, cached.season);
    }
  });

  return triggers.wrapDB(ctx);
}

export const mutation = customMutation(
  rawMutation,
  customCtx(withStandingsInvalidation),
);
export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(withStandingsInvalidation),
);
