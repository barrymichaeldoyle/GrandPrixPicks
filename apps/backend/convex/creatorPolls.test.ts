/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { plannedPollState, questionsForPhase } from './creatorPolls';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const ANSWERS = {
  pole: 'VER',
  winner: 'NOR',
  bangerDriver: 'ALO',
  clangerDriver: 'STR',
  bangerTeam: 'Ferrari',
  clangerTeam: 'Cadillac',
};

/**
 * A two-car grid is enough: every rule under test is about the poll, and the
 * roster it validates against comes from `drivers.loadRosterForRound`, which
 * has its own coverage.
 */
async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 13,
      name: 'Italian Grand Prix',
      slug: 'italy-2026',
      raceStartAt: 2_000,
      predictionLockAt: 1_000,
      status: 'upcoming',
      createdAt: 100,
      updatedAt: 100,
    });

    for (const [code, displayName, team] of [
      ['VER', 'Max Verstappen', 'Red Bull Racing'],
      ['NOR', 'Lando Norris', 'McLaren'],
      ['ALO', 'Fernando Alonso', 'Aston Martin'],
      ['STR', 'Lance Stroll', 'Aston Martin'],
      ['LEC', 'Charles Leclerc', 'Ferrari'],
      ['BOT', 'Valtteri Bottas', 'Cadillac'],
    ] as const) {
      const driverId = await ctx.db.insert('drivers', {
        code,
        displayName,
        team,
        createdAt: 100,
        updatedAt: 100,
      });
      await ctx.db.insert('driverTeamStints', {
        driverId,
        season: 2026,
        team,
        fromRound: 1,
        createdAt: 100,
        updatedAt: 100,
      });
    }

    await ctx.db.insert('creatorPolls', {
      slug: 'chinwag',
      creatorName: 'Tommo McCluskey',
      showName: 'Pre Race Chinwag',
      raceId,
      status: 'open',
      createdAt: 100,
      updatedAt: 100,
    });

    return raceId;
  });
}

describe('creatorPolls', () => {
  let t: ReturnType<typeof convexTest>;
  let raceId: Id<'races'>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    raceId = await seed(t);
  });

  it('offers the round the poll points at, with its drivers and teams', async () => {
    const poll = await t.query(api.creatorPolls.getPoll, { slug: 'chinwag' });

    expect(poll?.race.name).toBe('Italian Grand Prix');
    expect(poll?.questions.map((q) => q.label)).toEqual([
      'POLE POSITION',
      'RACE WINNER',
      'BANGER DRIVER',
      'CLANGER DRIVER',
      'BANGER TEAM',
      'CLANGER TEAM',
    ]);
    expect(poll?.drivers).toHaveLength(6);
    expect(poll?.teams).toContain('Cadillac');
  });

  it('counts a vote and reports it as a share of the total', async () => {
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: ANSWERS,
    });

    const results = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });

    expect(results?.totalVotes).toBe(1);
    const pole = results?.questions.find((q) => q.id === 'pole');
    expect(pole?.options).toEqual([
      { value: 'VER', label: 'Max Verstappen', count: 1, share: 1 },
    ]);
  });

  it('replaces the same browser’s earlier answer instead of counting twice', async () => {
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: ANSWERS,
    });
    const second = await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: { ...ANSWERS, pole: 'NOR' },
    });

    expect(second).toEqual({ changed: true });

    const results = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });
    expect(results?.totalVotes).toBe(1);
    expect(results?.questions.find((q) => q.id === 'pole')?.options).toEqual([
      { value: 'NOR', label: 'Lando Norris', count: 1, share: 1 },
    ]);
  });

  it('counts a second browser separately', async () => {
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: ANSWERS,
    });
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-two',
      answers: { ...ANSWERS, pole: 'NOR' },
    });

    const results = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });
    expect(results?.totalVotes).toBe(2);
  });

  it('refuses a driver who is not on this round’s grid', async () => {
    await expect(
      t.mutation(api.creatorPolls.submitVote, {
        slug: 'chinwag',
        voterKey: 'voter-one',
        answers: { ...ANSWERS, pole: 'HAM' },
      }),
    ).rejects.toThrow('POLE POSITION');
  });

  it('refuses a vote once voting is closed', async () => {
    await t.run(async (ctx) => {
      const poll = await ctx.db.query('creatorPolls').first();
      await ctx.db.patch(poll!._id, { status: 'closed' });
    });

    await expect(
      t.mutation(api.creatorPolls.submitVote, {
        slug: 'chinwag',
        voterKey: 'voter-one',
        answers: ANSWERS,
      }),
    ).rejects.toThrow('closed');
  });

  it('keeps votes filed under the race they were cast for when the poll moves on', async () => {
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: ANSWERS,
    });

    const nextRaceId = await t.run(async (ctx) => {
      const next = await ctx.db.insert('races', {
        season: 2026,
        round: 14,
        name: 'Spanish Grand Prix',
        slug: 'madrid-2026',
        raceStartAt: 4_000,
        predictionLockAt: 3_000,
        status: 'upcoming',
        createdAt: 100,
        updatedAt: 100,
      });
      const poll = await ctx.db.query('creatorPolls').first();
      await ctx.db.patch(poll!._id, { raceId: next });
      return next;
    });

    expect(nextRaceId).not.toBe(raceId);

    const results = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });
    expect(results?.race.name).toBe('Spanish Grand Prix');
    expect(results?.totalVotes).toBe(0);
  });

  it('keeps the admin surface off the public API', async () => {
    await expect(
      t.query(api.creatorPolls.adminListPolls, {}),
    ).rejects.toThrow();
    await expect(
      t.query(api.creatorPolls.adminExportVotes, { slug: 'chinwag' }),
    ).rejects.toThrow();
  });
});

describe('plannedPollState', () => {
  const race = {
    status: 'upcoming' as const,
    raceStartAt: 5_000,
    qualiStartAt: 3_000,
  };

  it('keeps predictions open until qualifying starts', () => {
    expect(plannedPollState(race, 2_999)).toEqual({
      phase: 'pre',
      status: 'open',
    });
  });

  /**
   * The first thing the poll asks about is pole, so it has to shut when
   * qualifying does. Running to the race would leave a pole vote open while
   * qualifying is on television.
   */
  it('closes predictions at the start of qualifying, not the race', () => {
    expect(plannedPollState(race, 3_000)).toEqual({
      phase: 'pre',
      status: 'closed',
    });
    expect(plannedPollState(race, 4_999)).toEqual({
      phase: 'pre',
      status: 'closed',
    });
  });

  it('falls back to the race start when there is no qualifying time', () => {
    expect(
      plannedPollState({ ...race, qualiStartAt: undefined }, 4_999),
    ).toEqual({ phase: 'pre', status: 'open' });
  });

  it('opens the Race Report vote once the race is finished', () => {
    expect(plannedPollState({ ...race, status: 'finished' }, 9_000)).toEqual({
      phase: 'post',
      status: 'open',
    });
  });
});

describe('questionsForPhase', () => {
  it('asks all six before the race', () => {
    expect(questionsForPhase('pre').map((q) => q.id)).toEqual([
      'pole',
      'winner',
      'bangerDriver',
      'clangerDriver',
      'bangerTeam',
      'clangerTeam',
    ]);
  });

  /**
   * Pole and race winner are facts by the time the Race Report airs. Asking a
   * crowd to vote on a fact is the one thing that would make this look stupid
   * on air.
   */
  it('drops the settled questions after the race', () => {
    expect(questionsForPhase('post').map((q) => q.id)).toEqual([
      'bangerDriver',
      'clangerDriver',
      'bangerTeam',
      'clangerTeam',
    ]);
  });
});

describe('creatorPolls across a weekend', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    await seed(t);
  });

  async function setPhase(phase: 'pre' | 'post') {
    await t.run(async (ctx) => {
      const poll = await ctx.db.query('creatorPolls').first();
      await ctx.db.patch(poll!._id, { phase });
    });
  }

  it('asks only the banger and clanger questions after the race', async () => {
    await setPhase('post');
    const poll = await t.query(api.creatorPolls.getPoll, { slug: 'chinwag' });

    expect(poll?.phase).toBe('post');
    expect(poll?.questions.map((q) => q.label)).toEqual([
      'BANGER DRIVER',
      'CLANGER DRIVER',
      'BANGER TEAM',
      'CLANGER TEAM',
    ]);
  });

  it('accepts a post-race vote without pole or winner', async () => {
    await setPhase('post');

    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: {
        bangerDriver: 'NOR',
        clangerDriver: 'STR',
        bangerTeam: 'Ferrari',
        clangerTeam: 'Cadillac',
      },
    });

    const results = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });
    expect(results?.totalVotes).toBe(1);
  });

  /** The two phases are separate ballots, not one that gets overwritten. */
  it("keeps the two phases' votes apart", async () => {
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: ANSWERS,
    });

    await setPhase('post');
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: {
        bangerDriver: 'NOR',
        clangerDriver: 'STR',
        bangerTeam: 'Ferrari',
        clangerTeam: 'Cadillac',
      },
    });

    const after = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });
    expect(after?.totalVotes).toBe(1);
    expect(after?.priorVotes).toBe(1);

    await setPhase('pre');
    const before = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });
    expect(before?.totalVotes).toBe(1);
    expect(
      before?.questions.find((q) => q.id === 'bangerDriver')?.options[0]?.value,
    ).toBe('ALO');
  });

  it('carries the pre-race answer alongside the post-race one', async () => {
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: ANSWERS,
    });

    await setPhase('post');
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: {
        bangerDriver: 'NOR',
        clangerDriver: 'STR',
        bangerTeam: 'Ferrari',
        clangerTeam: 'Cadillac',
      },
    });

    const results = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });
    const banger = results?.questions.find((q) => q.id === 'bangerDriver');

    expect(banger?.options[0]?.value).toBe('NOR');
    expect(banger?.before[0]?.value).toBe('ALO');
  });

  it('sets the settled questions against what the crowd called', async () => {
    await t.mutation(api.creatorPolls.submitVote, {
      slug: 'chinwag',
      voterKey: 'voter-one',
      answers: ANSWERS,
    });

    await t.run(async (ctx) => {
      const race = await ctx.db.query('races').first();
      const ver = await ctx.db
        .query('drivers')
        .filter((q) => q.eq(q.field('code'), 'VER'))
        .unique();
      const nor = await ctx.db
        .query('drivers')
        .filter((q) => q.eq(q.field('code'), 'NOR'))
        .unique();

      await ctx.db.insert('results', {
        raceId: race!._id,
        sessionType: 'quali',
        classification: [nor!._id, ver!._id],
        publishedAt: 200,
        updatedAt: 200,
      });
    });

    await setPhase('post');
    const results = await t.query(api.creatorPolls.getResults, {
      slug: 'chinwag',
    });

    const pole = results?.settled.find((entry) => entry.id === 'pole');
    expect(pole?.actual.code).toBe('NOR');
    expect(pole?.crowd?.value).toBe('VER');
    // Race is unpublished, so it is absent rather than guessed at.
    expect(results?.settled.some((entry) => entry.id === 'winner')).toBe(false);
  });
});

describe('picker order', () => {
  /**
   * The picker copies his form's order exactly: grouped by constructor in his
   * 2024-vintage order, each team led by its senior driver. A regular of his
   * should not be able to tell the two lists apart.
   */
  it("matches his form's order, not the championship", async () => {
    const t = convexTest(schema, modules);
    const raceId = await seed(t);

    await t.run(async (ctx) => {
      const byCode = new Map(
        (await ctx.db.query('drivers').collect()).map((d) => [d.code, d._id]),
      );

      // Aston Martin out-scores everyone. His order still puts McLaren and
      // Ferrari first, so a championship-driven sort would fail this.
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'race',
        classification: [
          byCode.get('STR')!,
          byCode.get('ALO')!,
          byCode.get('NOR')!,
        ],
        publishedAt: 200,
        updatedAt: 200,
      });
    });

    const poll = await t.query(api.creatorPolls.getPoll, { slug: 'chinwag' });

    // Seeded grid: NOR (McLaren), LEC (Ferrari), VER (Red Bull),
    // ALO + STR (Aston Martin), BOT (Cadillac).
    expect(poll!.drivers.map((d) => d.code)).toEqual([
      'NOR',
      'LEC',
      'VER',
      'ALO',
      'STR',
      'BOT',
    ]);
    expect(poll!.teams).toEqual([
      'McLaren',
      'Ferrari',
      'Red Bull Racing',
      'Aston Martin',
      'Cadillac',
    ]);
  });

  /**
   * His list is a snapshot and goes stale the way the rest of his form does.
   * A driver he has not added must still appear, beside their team-mate, or a
   * mid-season replacement would be unpickable.
   */
  it('keeps a driver his list has never heard of, next to their team-mate', async () => {
    const t = convexTest(schema, modules);
    await seed(t);

    await t.run(async (ctx) => {
      const driverId = await ctx.db.insert('drivers', {
        code: 'ZZZ',
        displayName: 'New Driver',
        team: 'McLaren',
        createdAt: 100,
        updatedAt: 100,
      });
      await ctx.db.insert('driverTeamStints', {
        driverId,
        season: 2026,
        team: 'McLaren',
        fromRound: 1,
        createdAt: 100,
        updatedAt: 100,
      });
    });

    const poll = await t.query(api.creatorPolls.getPoll, { slug: 'chinwag' });
    const codes = poll!.drivers.map((d) => d.code);

    // Listed team-mate first, unlisted driver straight after, and neither of
    // them anywhere near the bottom of the list.
    expect(codes.slice(0, 2)).toEqual(['NOR', 'ZZZ']);
  });
});
