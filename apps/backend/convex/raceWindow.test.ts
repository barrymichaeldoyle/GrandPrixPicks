/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { ConvexError } from 'convex/values';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

// A closed window is an expected rejection. A plain Error reaches the error
// tracker as an uncaught failure, so these guards must throw ConvexError.
async function setupFinishedRace() {
  const t = convexTest(schema, modules);
  const raceId = await t.run(async (ctx) => {
    await ctx.db.insert('users', {
      clerkUserId: 'viewer',
      username: 'viewer',
      createdAt: 0,
      updatedAt: 0,
    });
    return await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Australian Grand Prix',
      slug: 'australia-2026',
      raceStartAt: 1,
      predictionLockAt: 1,
      status: 'finished',
      createdAt: 0,
      updatedAt: 0,
    });
  });
  return { viewer: t.withIdentity({ subject: 'viewer' }), raceId };
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the mutation to reject');
}

describe('race window guards', () => {
  it('rejects H2H picks for a closed race with a ConvexError', async () => {
    const { viewer, raceId } = await setupFinishedRace();

    const error = await rejection(
      viewer.mutation(api.h2h.submitH2HPredictions, { raceId, picks: [] }),
    );

    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<string>).data).toBe(
      'H2H predictions are only open for the next upcoming race',
    );
  });

  it('rejects Top 5 picks for a closed race with a ConvexError', async () => {
    const { viewer, raceId } = await setupFinishedRace();

    const error = await rejection(
      viewer.mutation(api.predictions.submitPrediction, { raceId, picks: [] }),
    );

    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<string>).data).toBe(
      'Predictions are only open for the next upcoming race',
    );
  });

  it('rejects randomized picks for a closed race with a ConvexError', async () => {
    const { viewer, raceId } = await setupFinishedRace();

    const error = await rejection(
      viewer.mutation(api.predictions.randomizePredictions, { raceId }),
    );

    expect(error).toBeInstanceOf(ConvexError);
  });
});
