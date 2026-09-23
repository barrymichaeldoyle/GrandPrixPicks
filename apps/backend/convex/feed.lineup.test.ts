/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

describe('lineup change feed events', () => {
  it("carries each driver's nationality for the flags beside their names", async () => {
    const t = convexTest(schema, modules);
    const eventId = await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        clerkUserId: 'viewer',
        username: 'viewer',
        createdAt: 0,
        updatedAt: 0,
      });
      for (const [code, displayName, nationality] of [
        ['LAW', 'Liam Lawson', 'NZ'],
        ['HAD', 'Isack Hadjar', 'FR'],
        ['TSU', 'Yuki Tsunoda', 'JP'],
      ] as const) {
        await ctx.db.insert('drivers', {
          code,
          displayName,
          nationality,
          createdAt: 0,
          updatedAt: 0,
        });
      }
      return await ctx.db.insert('feedEvents', {
        type: 'lineup_change',
        round: 15,
        seatMoves: [
          {
            team: 'Red Bull Racing',
            outDriverCode: 'LAW',
            outDriverName: 'Liam Lawson',
            inDriverCode: 'HAD',
            inDriverName: 'Isack Hadjar',
          },
          {
            team: 'Racing Bulls',
            outDriverCode: 'TSU',
            outDriverName: 'Yuki Tsunoda',
            inDriverCode: 'LAW',
            inDriverName: 'Liam Lawson',
          },
        ],
        createdAt: 0,
      });
    });

    const result = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.feed.getFeedEvent, { feedEventId: eventId });

    expect(result?.event.seatMoves).toEqual([
      expect.objectContaining({ outNationality: 'NZ', inNationality: 'FR' }),
      expect.objectContaining({ outNationality: 'JP', inNationality: 'NZ' }),
    ]);
  });
});
