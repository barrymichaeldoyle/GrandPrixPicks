import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { loadRosterForRound } from './drivers';
import { loadChampionship } from './f1Standings';
import { getViewer, requireAdmin } from './lib/auth';

/**
 * A creator's audience poll, run across both halves of a race weekend.
 * See `docs/creator-poll-poc.md`.
 *
 * This is not a prediction game and must not become one. Nothing here is ever
 * scored against a result, and no individual is ranked: the creator reads the
 * percentages out on his show and that is the whole feature. Anything that
 * compares one person's answer to what happened belongs in `predictions.ts`,
 * under an account.
 *
 * Tommo streams twice a round, a Predictions show before the race and a Race
 * Report after, and runs the Bangers & Clangers segment in both. So the poll
 * has two phases:
 *
 *   pre  — six questions: who WILL take pole, who WILL win, and the four
 *          banger/clanger picks.
 *   post — the four banger/clanger picks only, asked as who DID. Pole and race
 *          winner are settled facts by then, and asking the audience to vote on
 *          a fact is the one thing that would make the page look stupid on air.
 *
 * The four overlapping questions are what make the post-race board worth
 * having: "before the race you said Alonso, afterwards you said Antonelli" is a
 * segment, and it is the thing a Google Form structurally cannot do.
 */
export const POLL_QUESTIONS = [
  { id: 'pole', label: 'POLE POSITION', kind: 'driver', phases: ['pre'] },
  { id: 'winner', label: 'RACE WINNER', kind: 'driver', phases: ['pre'] },
  {
    id: 'bangerDriver',
    label: 'BANGER DRIVER',
    kind: 'driver',
    phases: ['pre', 'post'],
  },
  {
    id: 'clangerDriver',
    label: 'CLANGER DRIVER',
    kind: 'driver',
    phases: ['pre', 'post'],
  },
  {
    id: 'bangerTeam',
    label: 'BANGER TEAM',
    kind: 'team',
    phases: ['pre', 'post'],
  },
  {
    id: 'clangerTeam',
    label: 'CLANGER TEAM',
    kind: 'team',
    phases: ['pre', 'post'],
  },
] as const;

type QuestionId = (typeof POLL_QUESTIONS)[number]['id'];
type Phase = 'pre' | 'post';

const phaseValidator = v.union(v.literal('pre'), v.literal('post'));

/** Rows written before the poll had phases are pre-race rows. */
function pollPhase(row: { phase?: Phase }): Phase {
  return row.phase ?? 'pre';
}

export function questionsForPhase(phase: Phase) {
  return POLL_QUESTIONS.filter((question) =>
    (question.phases as readonly string[]).includes(phase),
  );
}

const answersValidator = v.object({
  pole: v.optional(v.string()),
  winner: v.optional(v.string()),
  bangerDriver: v.string(),
  clangerDriver: v.string(),
  bangerTeam: v.string(),
  clangerTeam: v.string(),
});

/** Answer id to the column it is stored in. */
const ANSWER_FIELDS = {
  pole: 'poleDriverCode',
  winner: 'winnerDriverCode',
  bangerDriver: 'bangerDriverCode',
  clangerDriver: 'clangerDriverCode',
  bangerTeam: 'bangerTeam',
  clangerTeam: 'clangerTeam',
} as const satisfies Record<QuestionId, keyof Doc<'creatorPollVotes'>>;

/**
 * His dropdown order, copied from the form exactly.
 *
 * Grouped by constructor, each team led by its senior driver. The constructor
 * order is the 2024 championship (McLaren, Ferrari, Red Bull, Mercedes...),
 * which is the season before last: he built the form once and has not re-sorted
 * it. We match it anyway, because the point of this page is that his audience
 * cannot tell it apart from the form they already use, and a list in a
 * different order is the first thing a regular would notice.
 *
 * MAINTENANCE: this is a snapshot, so it goes stale the way his does. A driver
 * or team missing from it is not dropped — they sort after the listed ones
 * inside their team, and a listed team always beats an unlisted one. That is
 * what keeps a mid-season replacement (Tsunoda, who is in a Racing Bulls seat
 * and is absent from his list) in the picker rather than off the end of it.
 */
const CHINWAG_TEAM_ORDER = [
  'McLaren',
  'Ferrari',
  'Red Bull Racing',
  'Mercedes',
  'Aston Martin',
  'Alpine',
  'Haas',
  'Racing Bulls',
  'Williams',
  'Audi',
  'Cadillac',
] as const;

const CHINWAG_DRIVER_ORDER = [
  'NOR',
  'PIA',
  'LEC',
  'HAM',
  'VER',
  'HAD',
  'RUS',
  'ANT',
  'ALO',
  'STR',
  'GAS',
  'COL',
  'OCO',
  'BEA',
  'LIN',
  'LAW',
  'SAI',
  'ALB',
  'HUL',
  'BOR',
  'BOT',
  'PER',
] as const;

/** Position in a fixed list, with anything unlisted sorting after all of it. */
function rankIn(list: readonly string[], value: string | null): number {
  const index = value == null ? -1 : list.indexOf(value);
  return index === -1 ? list.length : index;
}

async function findPoll(ctx: QueryCtx, slug: string) {
  return await ctx.db
    .query('creatorPolls')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();
}

async function votesFor(
  ctx: QueryCtx,
  poll: Doc<'creatorPolls'>,
  raceId: Id<'races'>,
  phase: Phase,
) {
  return await ctx.db
    .query('creatorPollVotes')
    .withIndex('by_poll_race_phase', (q) =>
      q.eq('pollId', poll._id).eq('raceId', raceId).eq('phase', phase),
    )
    .take(20000);
}

/**
 * The grid the poll is asking about, plus the teams derived from it.
 *
 * Both lists come from the round's real roster rather than a hand-kept array,
 * which is the reason his dropdown still lists Hadjar in a seat he lost before
 * the Dutch Grand Prix and ours does not.
 */
async function loadOptions(ctx: QueryCtx, race: Doc<'races'>) {
  // One pass for both tables. `loadRosterForRound` would otherwise scan the
  // season's results again for the constructor points it sorts by.
  const championship = await loadChampionship(ctx, race.season);
  // Still loaded, but only to spare `loadRosterForRound` a second pass over the
  // season's results — the picker's order no longer depends on it.
  const teamPoints = new Map(
    championship.constructors.map((entry) => [entry.team, entry.points]),
  );
  const driverPoints = new Map(
    championship.drivers.map((entry) => [entry.code, entry.points]),
  );

  const roster = await loadRosterForRound(ctx, {
    season: race.season,
    round: race.round,
    teamPoints,
  });

  /**
   * Ordered to match his form: see {@link CHINWAG_TEAM_ORDER}.
   *
   * Anyone his list does not know about falls through to the championship, so
   * a new driver lands next to their team-mate rather than at the bottom, and a
   * new team lands after the eleven he lists rather than in the middle of them.
   */
  const drivers = [...roster].sort((a, b) => {
    const teamDelta =
      rankIn(CHINWAG_TEAM_ORDER, a.team ?? null) -
      rankIn(CHINWAG_TEAM_ORDER, b.team ?? null);
    if (teamDelta !== 0) {
      return teamDelta;
    }

    const driverDelta =
      rankIn(CHINWAG_DRIVER_ORDER, a.code) -
      rankIn(CHINWAG_DRIVER_ORDER, b.code);
    if (driverDelta !== 0) {
      return driverDelta;
    }

    const pointsDelta =
      (driverPoints.get(b.code) ?? 0) - (driverPoints.get(a.code) ?? 0);
    if (pointsDelta !== 0) {
      return pointsDelta;
    }
    return (a.number ?? 999) - (b.number ?? 999);
  });

  // Derived from the driver order above, so the team dropdown and the driver
  // dropdown are in the same order as each other and as his form.
  const teams: string[] = [];
  for (const driver of drivers) {
    if (driver.team && !teams.includes(driver.team)) {
      teams.push(driver.team);
    }
  }

  return {
    drivers: drivers.map((driver) => ({
      code: driver.code,
      displayName: driver.displayName,
      team: driver.team ?? null,
      // Both are for the picker: the flag and the number are how a fan
      // recognises a driver at a glance, and the code is what they type.
      nationality: driver.nationality ?? null,
      number: driver.number ?? null,
    })),
    teams,
  };
}

/** Who actually took pole and won, once those sessions have been published. */
async function loadActuals(ctx: QueryCtx, raceId: Id<'races'>) {
  async function winnerOf(sessionType: 'quali' | 'race') {
    const result = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', raceId).eq('sessionType', sessionType),
      )
      .unique();

    const first = result?.classification[0];
    if (!first) {
      return null;
    }

    const driver = await ctx.db.get(first);
    return driver
      ? { code: driver.code, displayName: driver.displayName }
      : null;
  }

  return { pole: await winnerOf('quali'), winner: await winnerOf('race') };
}

function tally(
  votes: Doc<'creatorPollVotes'>[],
  question: (typeof POLL_QUESTIONS)[number],
  driverNames: Map<string, string>,
) {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    const value = vote[ANSWER_FIELDS[question.id]];
    if (typeof value === 'string') {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label:
        question.kind === 'driver' ? (driverNames.get(value) ?? value) : value,
      count,
      share: votes.length === 0 ? 0 : count / votes.length,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export const getPoll = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const poll = await findPoll(ctx, args.slug);
    if (!poll) {
      return null;
    }

    const race = await ctx.db.get(poll.raceId);
    if (!race) {
      return null;
    }

    const phase = pollPhase(poll);
    const { drivers, teams } = await loadOptions(ctx, race);

    return {
      slug: poll.slug,
      creatorName: poll.creatorName,
      showName: poll.showName,
      status: poll.status,
      phase,
      race: {
        name: race.name,
        round: race.round,
        season: race.season,
        raceStartAt: race.raceStartAt,
        qualiStartAt: race.qualiStartAt ?? null,
      },
      questions: questionsForPhase(phase).map((question) => ({
        id: question.id,
        label: question.label,
        kind: question.kind,
      })),
      drivers,
      teams,
    };
  },
});

/**
 * Live tallies for the results board.
 *
 * Only answers somebody picked are returned, ordered by share. A board that
 * lists all 22 drivers with eighteen zeroes on it is unreadable at streaming
 * distance, and the zeroes are not the thing he reads out.
 *
 * On the post-race phase each question also carries `before`: the same question
 * as the same crowd answered it on Thursday. That pairing is the segment.
 */
export const getResults = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const poll = await findPoll(ctx, args.slug);
    if (!poll) {
      return null;
    }

    const race = await ctx.db.get(poll.raceId);
    if (!race) {
      return null;
    }

    const phase = pollPhase(poll);
    const votes = await votesFor(ctx, poll, poll.raceId, phase);
    const priorVotes =
      phase === 'post' ? await votesFor(ctx, poll, poll.raceId, 'pre') : [];

    const { drivers } = await loadOptions(ctx, race);
    const driverNames = new Map(drivers.map((d) => [d.code, d.displayName]));
    const actuals = await loadActuals(ctx, poll.raceId);

    const questions = questionsForPhase(phase).map((question) => ({
      id: question.id,
      label: question.label,
      options: tally(votes, question, driverNames),
      before:
        phase === 'post' && priorVotes.length > 0
          ? tally(priorVotes, question, driverNames).slice(0, 1)
          : [],
    }));

    /**
     * Pole and race winner are not asked after the race, so on the post-race
     * board they appear as a settled fact next to what the crowd called: "you
     * said Verstappen, it was Norris". Present only once we have published the
     * session, and silently absent until then.
     */
    const settled =
      phase === 'post'
        ? (
            [
              { id: 'pole', label: 'POLE POSITION', actual: actuals.pole },
              { id: 'winner', label: 'RACE WINNER', actual: actuals.winner },
            ] as const
          )
            .filter((entry) => entry.actual !== null)
            .map((entry) => ({
              id: entry.id,
              label: entry.label,
              actual: entry.actual!,
              crowd:
                tally(
                  priorVotes,
                  POLL_QUESTIONS.find((q) => q.id === entry.id)!,
                  driverNames,
                )[0] ?? null,
            }))
        : [];

    return {
      creatorName: poll.creatorName,
      showName: poll.showName,
      status: poll.status,
      phase,
      race: { name: race.name, round: race.round, season: race.season },
      totalVotes: votes.length,
      priorVotes: priorVotes.length,
      questions,
      settled,
    };
  },
});

/**
 * Cast or change a vote.
 *
 * `voterKey` is a random id the browser keeps in `localStorage`, so a returning
 * voter patches their own row instead of adding a second one. That is the
 * entire de-duplication story and it is deliberately weaker than Google's
 * per-account limit: closing the rest of the gap means storing a derived
 * identifier for someone else's audience, which is not a trade worth making
 * for "62% say Verstappen takes pole".
 */
export const submitVote = mutation({
  args: {
    slug: v.string(),
    voterKey: v.string(),
    answers: answersValidator,
  },
  handler: async (ctx, args) => {
    const poll = await findPoll(ctx, args.slug);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.status === 'closed') {
      throw new Error('Voting has closed for this race');
    }

    const race = await ctx.db.get(poll.raceId);
    if (!race) {
      throw new Error('Poll not found');
    }

    const voterKey = args.voterKey.trim();
    if (voterKey.length < 8 || voterKey.length > 64) {
      throw new Error('Invalid voter key');
    }

    const phase = pollPhase(poll);
    const { drivers, teams } = await loadOptions(ctx, race);
    const driverCodes = new Set(drivers.map((driver) => driver.code));
    const teamNames = new Set(teams);

    const fields: Record<string, string> = {};
    for (const question of questionsForPhase(phase)) {
      const value = args.answers[question.id];
      const allowed = question.kind === 'driver' ? driverCodes : teamNames;
      if (!value || !allowed.has(value)) {
        throw new Error(`Pick an option for ${question.label}`);
      }
      fields[ANSWER_FIELDS[question.id]] = value;
    }

    const now = Date.now();
    const existing = await ctx.db
      .query('creatorPollVotes')
      .withIndex('by_poll_race_phase_voter', (q) =>
        q
          .eq('pollId', poll._id)
          .eq('raceId', poll.raceId)
          .eq('phase', phase)
          .eq('voterKey', voterKey),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
      return { changed: true };
    }

    await ctx.db.insert('creatorPollVotes', {
      pollId: poll._id,
      raceId: poll.raceId,
      phase,
      voterKey,
      bangerDriverCode: fields.bangerDriverCode!,
      clangerDriverCode: fields.clangerDriverCode!,
      bangerTeam: fields.bangerTeam!,
      clangerTeam: fields.clangerTeam!,
      poleDriverCode: fields.poleDriverCode,
      winnerDriverCode: fields.winnerDriverCode,
      createdAt: now,
      updatedAt: now,
    });

    return { changed: false };
  },
});

/** The viewer's own answers for the current phase, so they see what they said. */
export const getMyVote = query({
  args: { slug: v.string(), voterKey: v.string() },
  handler: async (ctx, args) => {
    const poll = await findPoll(ctx, args.slug);
    if (!poll) {
      return null;
    }

    const vote = await ctx.db
      .query('creatorPollVotes')
      .withIndex('by_poll_race_phase_voter', (q) =>
        q
          .eq('pollId', poll._id)
          .eq('raceId', poll.raceId)
          .eq('phase', pollPhase(poll))
          .eq('voterKey', args.voterKey),
      )
      .unique();

    if (!vote) {
      return null;
    }

    return {
      pole: vote.poleDriverCode ?? undefined,
      winner: vote.winnerDriverCode ?? undefined,
      bangerDriver: vote.bangerDriverCode,
      clangerDriver: vote.clangerDriverCode,
      bangerTeam: vote.bangerTeam,
      clangerTeam: vote.clangerTeam,
    };
  },
});

// ============ AUTO-ADVANCE ============

/**
 * Where a poll with `autoAdvance` on should be, given the clock.
 *
 * The weekend has four states and they all fall out of times the race row
 * already carries, so nobody has to remember to do anything:
 *
 *   before quali   pre,  open   — predictions are live
 *   quali → flag   pre,  closed — the questions are being answered on track
 *   race finished  post, open   — the Race Report vote is live
 *
 * Pre-race closes at the *first* thing it asks about, which is qualifying, not
 * the race. Leaving a pole vote open while qualifying is on television is the
 * kind of detail that decides whether a creator trusts the tool.
 *
 * Exported and pure so the behaviour is testable without a clock or a cron.
 */
export function plannedPollState(
  race: Pick<Doc<'races'>, 'status' | 'raceStartAt' | 'qualiStartAt'>,
  now: number,
): { phase: Phase; status: 'open' | 'closed' } {
  if (race.status === 'finished') {
    return { phase: 'post', status: 'open' };
  }

  const closesAt = race.qualiStartAt ?? race.raceStartAt;
  return { phase: 'pre', status: now < closesAt ? 'open' : 'closed' };
}

/**
 * Move every auto-advancing poll to where the calendar says it should be.
 *
 * Runs on a cron. Deliberately does nothing to a poll that has not opted in:
 * moving someone's poll under them without being asked is worse than being
 * late, and the manual controls stay the source of truth for anyone else.
 */
export const advanceScheduledPolls = internalMutation({
  args: {},
  handler: async (ctx) => {
    const polls = await ctx.db.query('creatorPolls').take(50);
    const now = Date.now();
    let moved = 0;

    for (const poll of polls) {
      if (!poll.autoAdvance) {
        continue;
      }

      const race = await ctx.db.get(poll.raceId);
      if (!race) {
        continue;
      }

      // A finished race hands the poll to the next round only once its own
      // post-race vote has had a weekend to run: the Race Report airs after the
      // flag, and rolling straight on would take the board off him mid-show.
      const target = await nextTargetRace(ctx, race, now);
      if (target && target._id !== race._id) {
        await ctx.db.patch(poll._id, {
          raceId: target._id,
          phase: 'pre',
          status: 'open',
          updatedAt: now,
        });
        moved += 1;
        continue;
      }

      const planned = plannedPollState(race, now);
      if (pollPhase(poll) !== planned.phase || poll.status !== planned.status) {
        await ctx.db.patch(poll._id, {
          phase: planned.phase,
          status: planned.status,
          updatedAt: now,
        });
        moved += 1;
      }
    }

    return { moved };
  },
});

/**
 * The next round, once the current one is done being talked about.
 *
 * `null` while the current race is still the one to ask about. The handover
 * happens when the next race's own weekend starts rather than the moment the
 * flag drops, which is what leaves the post-race vote open for the Race Report.
 */
async function nextTargetRace(
  ctx: MutationCtx,
  race: Doc<'races'>,
  now: number,
) {
  if (race.status !== 'finished') {
    return null;
  }

  const next = await ctx.db
    .query('races')
    .withIndex('by_season_round', (q) =>
      q.eq('season', race.season).gt('round', race.round),
    )
    .first();

  if (!next) {
    return null;
  }

  const opensAt = (next.qualiStartAt ?? next.raceStartAt) - 5 * 24 * 3600_000;
  return now >= opensAt ? next : null;
}

// ============ ADMIN ============

async function requirePollAdmin(ctx: QueryCtx) {
  requireAdmin(await getViewer(ctx));
}

export const adminListPolls = query({
  args: {},
  handler: async (ctx) => {
    await requirePollAdmin(ctx);

    const polls = await ctx.db.query('creatorPolls').take(50);

    return await Promise.all(
      polls.map(async (poll) => {
        const race = await ctx.db.get(poll.raceId);
        const phase = pollPhase(poll);

        return {
          _id: poll._id,
          slug: poll.slug,
          creatorName: poll.creatorName,
          showName: poll.showName,
          status: poll.status,
          phase,
          autoAdvance: poll.autoAdvance ?? false,
          raceId: poll.raceId,
          raceName: race?.name ?? 'Unknown race',
          preVotes: (await votesFor(ctx, poll, poll.raceId, 'pre')).length,
          postVotes: (await votesFor(ctx, poll, poll.raceId, 'post')).length,
          planned: race ? plannedPollState(race, Date.now()) : null,
        };
      }),
    );
  },
});

/**
 * Create the poll, or move it: another race, the other phase, open or closed.
 *
 * Re-pointing is what "reset for the weekend" means here: the votes stay filed
 * under the race and phase they were cast for, and the URL the creator has
 * already given his audience never changes.
 */
export const adminUpsertPoll = mutation({
  args: {
    slug: v.string(),
    creatorName: v.string(),
    showName: v.string(),
    raceId: v.id('races'),
    phase: phaseValidator,
    status: v.union(v.literal('open'), v.literal('closed')),
    autoAdvance: v.boolean(),
  },
  handler: async (ctx, args) => {
    requireAdmin(await getViewer(ctx));

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    const now = Date.now();
    const existing = await findPoll(ctx, args.slug);

    if (existing) {
      await ctx.db.patch(existing._id, {
        creatorName: args.creatorName,
        showName: args.showName,
        raceId: args.raceId,
        phase: args.phase,
        status: args.status,
        autoAdvance: args.autoAdvance,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('creatorPolls', {
      slug: args.slug,
      creatorName: args.creatorName,
      showName: args.showName,
      raceId: args.raceId,
      phase: args.phase,
      status: args.status,
      autoAdvance: args.autoAdvance,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Throw this race's votes away and start it over. */
export const adminResetVotes = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(await getViewer(ctx));

    const poll = await findPoll(ctx, args.slug);
    if (!poll) {
      throw new Error('Poll not found');
    }

    const votes = await ctx.db
      .query('creatorPollVotes')
      .withIndex('by_poll_race_phase', (q) =>
        q.eq('pollId', poll._id).eq('raceId', poll.raceId),
      )
      .take(20000);

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    return { deleted: votes.length };
  },
});

/** Rows for the CSV the creator gets. One line per vote, no identifiers. */
export const adminExportVotes = query({
  args: { slug: v.string(), raceId: v.optional(v.id('races')) },
  handler: async (ctx, args) => {
    await requirePollAdmin(ctx);

    const poll = await findPoll(ctx, args.slug);
    if (!poll) {
      return null;
    }

    const raceId: Id<'races'> = args.raceId ?? poll.raceId;
    const race = await ctx.db.get(raceId);

    const votes = await ctx.db
      .query('creatorPollVotes')
      .withIndex('by_poll_race_phase', (q) =>
        q.eq('pollId', poll._id).eq('raceId', raceId),
      )
      .take(20000);

    return {
      raceName: race?.name ?? 'Unknown race',
      rows: votes.map((vote) => ({
        submittedAt: new Date(vote.createdAt).toISOString(),
        phase: pollPhase(vote),
        pole: vote.poleDriverCode ?? '',
        winner: vote.winnerDriverCode ?? '',
        bangerDriver: vote.bangerDriverCode,
        clangerDriver: vote.clangerDriverCode,
        bangerTeam: vote.bangerTeam,
        clangerTeam: vote.clangerTeam,
      })),
    };
  },
});
