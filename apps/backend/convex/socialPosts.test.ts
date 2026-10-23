import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';
import {
  classificationRevision,
  resultsCardUrl,
  resultsPostText,
} from './socialPosts';

const modules = import.meta.glob('./**/*.ts');

const entries = [
  { position: 1, code: 'VER', name: 'Max Verstappen', status: null },
  { position: 2, code: 'LEC', name: 'Charles Leclerc', status: null },
  { position: 3, code: 'NOR', name: 'Lando Norris', status: null },
  { position: 4, code: 'HAM', name: 'Lewis Hamilton', status: 'dnf' },
];

describe('results post copy', () => {
  it('reads the podium in plain words per session', () => {
    expect(resultsPostText('Singapore Grand Prix', 'quali', entries)).toBe(
      'Singapore GP qualifying: Verstappen on pole, Leclerc second, Norris third.',
    );
    expect(resultsPostText('Singapore Grand Prix', 'race', entries)).toBe(
      'Singapore GP race: Verstappen wins from Leclerc and Norris.',
    );
  });

  it('skips non-finishers when naming the podium and needs three of them', () => {
    const dnfSecond = entries.map((entry) =>
      entry.position === 2
        ? { ...entry, status: 'dnf' }
        : { ...entry, status: null },
    );
    expect(resultsPostText('Monaco Grand Prix', 'sprint', dnfSecond)).toBe(
      'Monaco GP sprint: Verstappen wins from Norris and Hamilton.',
    );
    expect(() =>
      resultsPostText('Monaco Grand Prix', 'race', entries.slice(0, 2)),
    ).toThrow(/three classified/);
  });

  it('fingerprints the classification so an amendment is a new revision', () => {
    const before = classificationRevision(entries);
    const swapped = classificationRevision([
      entries[1],
      entries[0],
      ...entries.slice(2),
    ]);
    expect(before).toMatch(/^[0-9a-f]{8}$/);
    expect(swapped).not.toBe(before);
    expect(resultsCardUrl('usa-2026', 'quali', before)).toBe(
      `https://grandprixpicks.com/og/results?race=usa-2026&session=quali&v=${before}`,
    );
  });
});

describe('socialPosts journal', () => {
  it('records intent before the Buffer call and only retries failed or cancelled rows', async () => {
    const t = convexTest(schema, modules);
    const raceId = await t.run((ctx) =>
      ctx.db.insert('races', {
        season: 2026,
        round: 17,
        name: 'Singapore Grand Prix',
        slug: 'singapore-2026',
        raceStartAt: Date.now(),
        predictionLockAt: Date.now(),
        status: 'finished',
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    const id = await t.mutation(internal.socialPosts.begin, {
      raceId,
      sessionType: 'quali',
      revision: 'abc',
      text: 'Singapore GP qualifying: ...',
      dueAt: Date.now() + 1,
    });
    let rows = await t.query(internal.socialPosts.listForRace, { raceId });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('creating');
    expect(rows[0].attempts).toBe(1);

    await t.mutation(internal.socialPosts.setStatus, {
      id,
      status: 'scheduled',
      bufferPostId: 'buffer-1',
    });
    await expect(
      t.mutation(internal.socialPosts.begin, {
        raceId,
        sessionType: 'quali',
        revision: 'def',
        text: 'again',
        dueAt: Date.now() + 1,
        existingId: id,
      }),
    ).rejects.toThrow(/failed or cancelled/);

    await t.mutation(internal.socialPosts.setStatus, {
      id,
      status: 'cancelled',
    });
    const retried = await t.mutation(internal.socialPosts.begin, {
      raceId,
      sessionType: 'quali',
      revision: 'def',
      text: 'again',
      dueAt: Date.now() + 1,
      existingId: id,
    });
    expect(retried).toBe(id);
    rows = await t.query(internal.socialPosts.listForRace, { raceId });
    expect(rows[0]).toMatchObject({
      status: 'creating',
      revision: 'def',
      attempts: 2,
    });
    expect(rows[0].bufferPostId).toBeUndefined();
  });

  it('lists recently published results with their post row', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const { driverIds } = await t.run(async (ctx) => {
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 17,
        name: 'Singapore Grand Prix',
        slug: 'singapore-2026',
        raceStartAt: now,
        predictionLockAt: now,
        status: 'finished',
        createdAt: 0,
        updatedAt: 0,
      });
      const driverIds = [];
      for (const [code, displayName] of [
        ['VER', 'Max Verstappen'],
        ['LEC', 'Charles Leclerc'],
        ['NOR', 'Lando Norris'],
      ]) {
        driverIds.push(
          await ctx.db.insert('drivers', {
            code,
            displayName,
            team: 'Ferrari',
            createdAt: 0,
            updatedAt: 0,
          }),
        );
      }
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'quali',
        classification: driverIds,
        driverStatuses: [{ driverId: driverIds[2], status: 'dnf' }],
        scoringStatus: 'complete',
        publishedAt: now - 1000,
        updatedAt: now - 1000,
      });
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'race',
        classification: driverIds,
        scoringStatus: 'complete',
        publishedAt: now - 48 * 60 * 60 * 1000,
        updatedAt: now,
      });
      return { raceId, driverIds };
    });
    const recent = await t.query(internal.socialPosts.recentResults, {
      since: now - 60 * 60 * 1000,
    });
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      raceSlug: 'singapore-2026',
      sessionType: 'quali',
      post: null,
    });
    expect(recent[0].entries.map((entry) => entry.code)).toEqual([
      'VER',
      'LEC',
      'NOR',
    ]);
    expect(recent[0].entries[2].status).toBe('dnf');
    expect(driverIds).toHaveLength(3);
  });
});
