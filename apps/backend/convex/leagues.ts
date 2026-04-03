import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import {
  getOrCreateViewer,
  getViewer,
  requireViewer,
} from './lib/auth';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const RESERVED_LEAGUE_SLUGS = new Set(['create']);

type LeagueLimits = {
  maxPrivateLeaguesCreated: number;
  maxPrivateLeaguesJoined: number;
  maxPublicLeaguesCreated: number;
  maxPublicLeaguesJoined: number;
};

const FREE_LIMITS: LeagueLimits = {
  maxPrivateLeaguesCreated: 5,
  maxPrivateLeaguesJoined: 5,
  maxPublicLeaguesCreated: 0,
  maxPublicLeaguesJoined: 5,
};

const SEASON_PASS_LIMITS: LeagueLimits = {
  maxPrivateLeaguesCreated: 50,
  maxPrivateLeaguesJoined: Number.POSITIVE_INFINITY,
  maxPublicLeaguesCreated: 5,
  maxPublicLeaguesJoined: Number.POSITIVE_INFINITY,
};

// League membership views currently materialize the full roster in one request.
// Keep the write-side contract aligned with that bounded read pattern.
const MAX_LEAGUE_MEMBERS = 5000;

export function countAdmins(
  members: ReadonlyArray<{ role: 'admin' | 'member' }>,
): number {
  return members.reduce(
    (count, member) => count + (member.role === 'admin' ? 1 : 0),
    0,
  );
}

function requireLeagueCounts(
  league: Doc<'leagues'>,
): { memberCount: number; adminCount: number } {
  if (league.memberCount === undefined || league.adminCount === undefined) {
    throw new Error('League counts are missing.');
  }

  return {
    memberCount: league.memberCount,
    adminCount: league.adminCount,
  };
}

async function hasSeasonPassForSeason(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
  season: number,
) {
  const pass = await ctx.db
    .query('userSeasonPasses')
    .withIndex('by_user_season', (q) =>
      q.eq('userId', userId).eq('season', season),
    )
    .unique();

  return !!pass;
}

async function getLeagueLimitsForUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
  season: number,
): Promise<{ limits: LeagueLimits; hasSeasonPass: boolean }> {
  const hasSeasonPass = await hasSeasonPassForSeason(ctx, userId, season);
  const limits = hasSeasonPass ? SEASON_PASS_LIMITS : FREE_LIMITS;
  return { limits, hasSeasonPass };
}

async function getDefaultLeagueSeason(ctx: MutationCtx | QueryCtx) {
  const now = Date.now();
  const nextUpcomingRace = await ctx.db
    .query('races')
    .withIndex('by_status_and_predictionLockAt', (q) =>
      q.eq('status', 'upcoming').gt('predictionLockAt', now),
    )
    .first();
  if (nextUpcomingRace) {
    return nextUpcomingRace.season;
  }

  const latestRace = await ctx.db
    .query('races')
    .withIndex('by_raceStartAt')
    .order('desc')
    .first();
  return latestRace?.season ?? 2026;
}

function validateSlug(slug: string): string {
  const trimmed = slug.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 30) {
    throw new Error('Slug must be between 3 and 30 characters');
  }
  if (RESERVED_LEAGUE_SLUGS.has(trimmed)) {
    throw new Error('This slug is reserved');
  }
  if (!SLUG_REGEX.test(trimmed)) {
    throw new Error(
      'Slug can only contain lowercase letters, numbers, and hyphens (no leading/trailing hyphens)',
    );
  }
  return trimmed;
}

async function requireLeagueAdmin(
  ctx: MutationCtx,
  leagueId: Id<'leagues'>,
  userId: Id<'users'>,
) {
  const membership = await ctx.db
    .query('leagueMembers')
    .withIndex('by_league_user', (q) =>
      q.eq('leagueId', leagueId).eq('userId', userId),
    )
    .unique();
  if (!membership || membership.role !== 'admin') {
    throw new Error('Not a league admin');
  }
  return membership;
}

// ──────────────────── Queries ────────────────────

export const getMyLeagues = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return [];
    }

    const memberships = await ctx.db
      .query('leagueMembers')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .take(MAX_LEAGUE_MEMBERS);

    const leagues = await Promise.all(
      memberships.map(async (m) => {
        const league = await ctx.db.get(m.leagueId);
        if (!league) {
          return null;
        }
        const counts = requireLeagueCounts(league);

        return {
          _id: league._id,
          name: league.name,
          slug: league.slug,
          description: league.description,
          season: league.season,
          memberCount: counts.memberCount,
          viewerRole: m.role,
          visibility: league.visibility,
        };
      }),
    );

    return leagues.filter(Boolean);
  },
});

export const listPublicLeagues = query({
  args: {
    season: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const season = args.season ?? (await getDefaultLeagueSeason(ctx));
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    const publicLeagues = await ctx.db
      .query('leagues')
      .withIndex('by_season_and_visibility', (q) =>
        q.eq('season', season).eq('visibility', 'public'),
      )
      .take(MAX_LEAGUE_MEMBERS);

    const leagues = await Promise.all(
      publicLeagues.map(async (league) => {
        const viewerMembership =
          viewer != null
            ? await ctx.db
                .query('leagueMembers')
                .withIndex('by_league_user', (q) =>
                  q.eq('leagueId', league._id).eq('userId', viewer._id),
                )
                .unique()
            : null;
        const counts = requireLeagueCounts(league);

        return {
          _id: league._id,
          name: league.name,
          slug: league.slug,
          description: league.description,
          season: league.season,
          memberCount: counts.memberCount,
          viewerRole: viewerMembership?.role ?? null,
          createdAt: league.createdAt,
        };
      }),
    );

    return leagues
      .sort((a, b) =>
        b.memberCount !== a.memberCount
          ? b.memberCount - a.memberCount
          : b.createdAt - a.createdAt,
      )
      .slice(0, limit);
  },
});

export const getLeagueBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);

    const league = await ctx.db
      .query('leagues')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    if (!league) {
      return null;
    }

    const viewerMembership =
      viewer != null
        ? await ctx.db
            .query('leagueMembers')
            .withIndex('by_league_user', (q) =>
              q.eq('leagueId', league._id).eq('userId', viewer._id),
            )
            .unique()
        : null;
    const counts = requireLeagueCounts(league);

    return {
      _id: league._id,
      name: league.name,
      slug: league.slug,
      description: league.description,
      season: league.season,
      memberCount: counts.memberCount,
      adminCount: counts.adminCount,
      viewerRole: viewerMembership?.role ?? null,
      hasPassword: !!league.password,
      createdBy: league.createdBy,
      visibility: league.visibility,
    };
  },
});

export const getLeagueMembers = query({
  args: { leagueId: v.id('leagues'), raceId: v.optional(v.id('races')) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return [];
    }

    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', args.leagueId))
      .take(MAX_LEAGUE_MEMBERS);

    // Only return members if viewer is a member
    const isMember = members.some((m) => m.userId === viewer._id);
    if (!isMember) {
      return [];
    }

    const users = await Promise.all(members.map((m) => ctx.db.get(m.userId)));
    const userMap = new Map(
      users
        .filter((user): user is NonNullable<typeof user> => user !== null)
        .map((user) => [user._id, user]),
    );

    let raceTop5Predictions = new Set<Id<'users'>>();
    let raceH2HPredictions = new Set<Id<'users'>>();
    if (args.raceId !== undefined) {
      for await (const prediction of ctx.db
        .query('predictions')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', args.raceId!).eq('sessionType', 'race'),
        )) {
        raceTop5Predictions.add(prediction.userId);
      }

      for await (const prediction of ctx.db
        .query('h2hPredictions')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', args.raceId!).eq('sessionType', 'race'),
        )) {
        raceH2HPredictions.add(prediction.userId);
      }
    }

    const enriched = await Promise.all(
      members.map(async (m) => {
        const user = userMap.get(m.userId);

        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          displayName: user?.displayName ?? user?.username ?? 'Anonymous',
          username: user?.username ?? 'Anonymous',
          avatarUrl: user?.avatarUrl,
          top5Picked:
            args.raceId !== undefined
              ? raceTop5Predictions.has(m.userId)
              : undefined,
          h2hPicked:
            args.raceId !== undefined
              ? raceH2HPredictions.has(m.userId)
              : undefined,
        };
      }),
    );

    // Admins first, then by join date
    return enriched.sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === 'admin' ? -1 : 1;
      }
      return a.joinedAt - b.joinedAt;
    });
  },
});

export const isSlugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const trimmed = args.slug.trim().toLowerCase();
    if (trimmed.length < 3 || trimmed.length > 30) {
      return false;
    }
    if (RESERVED_LEAGUE_SLUGS.has(trimmed)) {
      return false;
    }
    if (!SLUG_REGEX.test(trimmed)) {
      return false;
    }

    const existing = await ctx.db
      .query('leagues')
      .withIndex('by_slug', (q) => q.eq('slug', trimmed))
      .unique();

    return !existing;
  },
});

export const getMyLeagueUsage = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const season = args.season ?? (await getDefaultLeagueSeason(ctx));
    const hasSeasonPass = await hasSeasonPassForSeason(ctx, viewer._id, season);
    const limits = hasSeasonPass ? SEASON_PASS_LIMITS : FREE_LIMITS;

    const createdLeagues = await ctx.db
      .query('leagues')
      .withIndex('by_createdBy_and_season', (q) =>
        q.eq('createdBy', viewer._id).eq('season', season),
      )
      .take(MAX_LEAGUE_MEMBERS);

    let createdPrivate = 0;
    let createdPublic = 0;
    for (const league of createdLeagues) {
      if (league.visibility === 'private') {
        createdPrivate += 1;
      }
      if (league.visibility === 'public') {
        createdPublic += 1;
      }
    }

    const memberships = await ctx.db
      .query('leagueMembers')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .take(MAX_LEAGUE_MEMBERS);

    let joinedPrivate = 0;
    let joinedPublic = 0;
    for (const membership of memberships) {
      if (membership.role !== 'member') {
        continue;
      }
      const league = await ctx.db.get(membership.leagueId);
      if (!league || league.season !== season) {
        continue;
      }
      if (league.visibility === 'private') {
        joinedPrivate += 1;
      }
      if (league.visibility === 'public') {
        joinedPublic += 1;
      }
    }

    return {
      season,
      hasSeasonPass,
      limits,
      usage: {
        createdPrivate,
        createdPublic,
        joinedPrivate,
        joinedPublic,
      },
    };
  },
});

// ──────────────────── Mutations ────────────────────

const visibilityValidator = v.optional(
  v.union(v.literal('private'), v.literal('public')),
);

export const createLeague = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    password: v.optional(v.string()),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const now = Date.now();

    const visibility = args.visibility ?? 'private';
    if (visibility === 'public' && args.password?.trim()) {
      throw new Error('Public leagues cannot have a password');
    }

    const name = args.name.trim();
    if (name.length < 1 || name.length > 50) {
      throw new Error('League name must be between 1 and 50 characters');
    }

    const slug = validateSlug(args.slug);

    // Uniqueness check
    const existing = await ctx.db
      .query('leagues')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (existing) {
      throw new Error('This slug is already taken');
    }

    const description = args.description?.trim();
    if (description && description.length > 200) {
      throw new Error('Description must be 200 characters or less');
    }

    const password =
      visibility === 'private' ? args.password?.trim() || undefined : undefined;

    const season = await getDefaultLeagueSeason(ctx);
    const { limits, hasSeasonPass } = await getLeagueLimitsForUser(
      ctx,
      viewer._id,
      season,
    );

    // Only Season Pass users can create public leagues.
    if (visibility === 'public') {
      if (!hasSeasonPass) {
        throw new Error('Only Season Pass users can create public leagues.');
      }
    }

    // Count leagues created by this user for the season, by visibility.
    const createdLeagues = await ctx.db
      .query('leagues')
      .withIndex('by_createdBy_and_season', (q) =>
        q.eq('createdBy', viewer._id).eq('season', season),
      )
      .take(MAX_LEAGUE_MEMBERS);

    let createdPrivate = 0;
    let createdPublic = 0;
    for (const league of createdLeagues) {
      if (league.visibility === 'private') {
        createdPrivate += 1;
      }
      if (league.visibility === 'public') {
        createdPublic += 1;
      }
    }

    if (
      visibility === 'private' &&
      createdPrivate >= limits.maxPrivateLeaguesCreated
    ) {
      throw new Error(
        'You have reached the maximum number of private leagues you can create.',
      );
    }

    if (
      visibility === 'public' &&
      createdPublic >= limits.maxPublicLeaguesCreated
    ) {
      throw new Error(
        'You have reached the maximum number of public leagues you can create.',
      );
    }

    const leagueId = await ctx.db.insert('leagues', {
      name,
      slug,
      description: description || undefined,
      password,
      visibility,
      createdBy: viewer._id,
      season,
      memberCount: 1,
      adminCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('leagueMembers', {
      leagueId,
      userId: viewer._id,
      role: 'admin',
      joinedAt: now,
    });

    return { leagueId, slug };
  },
});

export const joinLeague = mutation({
  args: {
    leagueId: v.id('leagues'),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));

    const league = await ctx.db.get(args.leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    const season = league.season;
    const { limits } = await getLeagueLimitsForUser(ctx, viewer._id, season);

    if (league.password) {
      if (!args.password || args.password.trim() !== league.password) {
        throw new Error('Incorrect password');
      }
    }

    const existingMembership = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league_user', (q) =>
        q.eq('leagueId', league._id).eq('userId', viewer._id),
      )
      .unique();
    if (existingMembership) {
      throw new Error('You are already a member of this league');
    }

    const currentMembers = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', league._id))
      .take(MAX_LEAGUE_MEMBERS + 1);
    if (currentMembers.length >= MAX_LEAGUE_MEMBERS) {
      throw new Error('This league has reached the maximum number of members');
    }

    // Count existing memberships by visibility for this season.
    const memberships = await ctx.db
      .query('leagueMembers')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .take(MAX_LEAGUE_MEMBERS);

    let privateJoined = 0;
    let publicJoined = 0;

    for (const membership of memberships) {
      // "Join" limits only apply to leagues where the user is a regular member.
      if (membership.role !== 'member') {
        continue;
      }

      const mLeague = await ctx.db.get(membership.leagueId);
      if (!mLeague) {
        continue;
      }
      if (mLeague.season !== season) {
        continue;
      }

      if (mLeague.visibility === 'private') {
        privateJoined += 1;
      }
      if (mLeague.visibility === 'public') {
        publicJoined += 1;
      }
    }

    if (
      league.visibility === 'private' &&
      privateJoined >= limits.maxPrivateLeaguesJoined
    ) {
      throw new Error(
        'You have reached the maximum number of private leagues you can join.',
      );
    }

    if (
      league.visibility === 'public' &&
      publicJoined >= limits.maxPublicLeaguesJoined
    ) {
      throw new Error(
        'You have reached the maximum number of public leagues you can join.',
      );
    }

    await ctx.db.insert('leagueMembers', {
      leagueId: league._id,
      userId: viewer._id,
      role: 'member',
      joinedAt: Date.now(),
    });
    const counts = requireLeagueCounts(league);
    await ctx.db.patch(league._id, {
      memberCount: counts.memberCount + 1,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.feed.writeJoinedLeagueFeedEvent, {
      userId: viewer._id,
      leagueId: league._id,
    });

    return { leagueId: league._id, slug: league.slug };
  },
});

export const leaveLeague = mutation({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));

    const membership = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league_user', (q) =>
        q.eq('leagueId', args.leagueId).eq('userId', viewer._id),
      )
      .unique();
    if (!membership) {
      throw new Error('Not a member of this league');
    }

    if (membership.role === 'admin') {
      const admins = await ctx.db
        .query('leagueMembers')
        .withIndex('by_league', (q) => q.eq('leagueId', args.leagueId))
        .take(MAX_LEAGUE_MEMBERS);
      const adminCount = countAdmins(admins);
      const memberCount = admins.length;

      if (adminCount === 1 && memberCount > 1) {
        throw new Error(
          'You are the last admin. Promote another member before leaving.',
        );
      }
    }

    await ctx.db.delete(membership._id);
    const league = await ctx.db.get(args.leagueId);
    if (league) {
      const counts = requireLeagueCounts(league);
      await ctx.db.patch(league._id, {
        memberCount: Math.max(0, counts.memberCount - 1),
        adminCount:
          membership.role === 'admin'
            ? Math.max(0, counts.adminCount - 1)
            : counts.adminCount,
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateLeague = mutation({
  args: {
    leagueId: v.id('leagues'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await requireLeagueAdmin(ctx, args.leagueId, viewer._id);

    const league = await ctx.db.get(args.leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 1 || name.length > 50) {
        throw new Error('League name must be between 1 and 50 characters');
      }
      patch.name = name;
    }

    if (args.slug !== undefined) {
      const slug = validateSlug(args.slug);
      if (slug !== league.slug) {
        const existing = await ctx.db
          .query('leagues')
          .withIndex('by_slug', (q) => q.eq('slug', slug))
          .unique();
        if (existing) {
          throw new Error('This slug is already taken');
        }
        patch.slug = slug;
      }
    }

    if (args.description !== undefined) {
      const description = args.description.trim();
      if (description.length > 200) {
        throw new Error('Description must be 200 characters or less');
      }
      patch.description = description || undefined;
    }

    if (
      args.visibility !== undefined &&
      args.visibility !== league.visibility
    ) {
      throw new Error('League visibility cannot be changed after creation.');
    }

    await ctx.db.patch(args.leagueId, patch);
  },
});

export const setPassword = mutation({
  args: { leagueId: v.id('leagues'), password: v.string() },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await requireLeagueAdmin(ctx, args.leagueId, viewer._id);

    const league = await ctx.db.get(args.leagueId);
    if (!league) {
      throw new Error('League not found');
    }
    if (league.visibility === 'public') {
      throw new Error('Public leagues cannot have a password');
    }

    const trimmed = args.password.trim();
    if (trimmed.length < 1 || trimmed.length > 50) {
      throw new Error('Password must be between 1 and 50 characters');
    }

    await ctx.db.patch(args.leagueId, {
      password: trimmed,
      updatedAt: Date.now(),
    });
  },
});

export const removePassword = mutation({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await requireLeagueAdmin(ctx, args.leagueId, viewer._id);

    await ctx.db.patch(args.leagueId, {
      password: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const promoteMember = mutation({
  args: { leagueId: v.id('leagues'), userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await requireLeagueAdmin(ctx, args.leagueId, viewer._id);

    const membership = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league_user', (q) =>
        q.eq('leagueId', args.leagueId).eq('userId', args.userId),
      )
      .unique();
    if (!membership) {
      throw new Error('User is not a member');
    }
    if (membership.role === 'admin') {
      throw new Error('User is already an admin');
    }

    await ctx.db.patch(membership._id, { role: 'admin' });
    const league = await ctx.db.get(args.leagueId);
    if (league) {
      const counts = requireLeagueCounts(league);
      await ctx.db.patch(league._id, {
        adminCount: counts.adminCount + 1,
        updatedAt: Date.now(),
      });
    }
  },
});

export const demoteMember = mutation({
  args: { leagueId: v.id('leagues'), userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await requireLeagueAdmin(ctx, args.leagueId, viewer._id);

    if (args.userId === viewer._id) {
      const admins = await ctx.db
        .query('leagueMembers')
        .withIndex('by_league', (q) => q.eq('leagueId', args.leagueId))
        .take(MAX_LEAGUE_MEMBERS);
      const adminCount = countAdmins(admins);
      if (adminCount === 1) {
        throw new Error(
          'You are the last admin. Promote another member first.',
        );
      }
    }

    const membership = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league_user', (q) =>
        q.eq('leagueId', args.leagueId).eq('userId', args.userId),
      )
      .unique();
    if (!membership) {
      throw new Error('User is not a member');
    }
    if (membership.role === 'member') {
      throw new Error('User is already a member');
    }

    await ctx.db.patch(membership._id, { role: 'member' });
    const league = await ctx.db.get(args.leagueId);
    if (league) {
      const counts = requireLeagueCounts(league);
      await ctx.db.patch(league._id, {
        adminCount: Math.max(0, counts.adminCount - 1),
        updatedAt: Date.now(),
      });
    }
  },
});

export const removeMember = mutation({
  args: { leagueId: v.id('leagues'), userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await requireLeagueAdmin(ctx, args.leagueId, viewer._id);

    if (args.userId === viewer._id) {
      throw new Error('Cannot remove yourself. Use leave instead.');
    }

    const membership = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league_user', (q) =>
        q.eq('leagueId', args.leagueId).eq('userId', args.userId),
      )
      .unique();
    if (!membership) {
      throw new Error('User is not a member');
    }

    await ctx.db.delete(membership._id);
    const league = await ctx.db.get(args.leagueId);
    if (league) {
      const counts = requireLeagueCounts(league);
      await ctx.db.patch(league._id, {
        memberCount: Math.max(0, counts.memberCount - 1),
        adminCount:
          membership.role === 'admin'
            ? Math.max(0, counts.adminCount - 1)
            : counts.adminCount,
        updatedAt: Date.now(),
      });
    }
  },
});

export const deleteLeague = mutation({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await requireLeagueAdmin(ctx, args.leagueId, viewer._id);

    // Delete all members
    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', args.leagueId))
      .take(MAX_LEAGUE_MEMBERS);

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.leagueId);
  },
});
