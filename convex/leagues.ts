import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { getOrCreateViewer, getViewer, requireViewer } from './lib/auth';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function validateSlug(slug: string): string {
  const trimmed = slug.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 30) {
    throw new Error('Slug must be between 3 and 30 characters');
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
    if (!viewer) return [];

    const memberships = await ctx.db
      .query('leagueMembers')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .collect();

    const leagues = await Promise.all(
      memberships.map(async (m) => {
        const league = await ctx.db.get(m.leagueId);
        if (!league) return null;

        const members = await ctx.db
          .query('leagueMembers')
          .withIndex('by_league', (q) => q.eq('leagueId', league._id))
          .collect();

        return {
          _id: league._id,
          name: league.name,
          slug: league.slug,
          description: league.description,
          season: league.season,
          memberCount: members.length,
          viewerRole: m.role,
          visibility: league.visibility,
        };
      }),
    );

    return leagues.filter(Boolean);
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

    if (!league) return null;

    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', league._id))
      .collect();

    let viewerRole: 'admin' | 'member' | null = null;
    if (viewer) {
      const viewerMembership = members.find((m) => m.userId === viewer._id);
      viewerRole = viewerMembership?.role ?? null;
    }

    const adminCount = members.filter((m) => m.role === 'admin').length;

    return {
      _id: league._id,
      name: league.name,
      slug: league.slug,
      description: league.description,
      season: league.season,
      memberCount: members.length,
      adminCount,
      viewerRole,
      hasPassword: !!league.password,
      createdBy: league.createdBy,
      visibility: league.visibility,
    };
  },
});

export const getLeagueMembers = query({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return [];

    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', args.leagueId))
      .collect();

    // Only return members if viewer is a member
    const isMember = members.some((m) => m.userId === viewer._id);
    if (!isMember) return [];

    const enriched = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          username: user?.username ?? 'Anonymous',
          avatarUrl: user?.avatarUrl,
        };
      }),
    );

    // Admins first, then by join date
    return enriched.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
      return a.joinedAt - b.joinedAt;
    });
  },
});

export const isSlugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const trimmed = args.slug.trim().toLowerCase();
    if (trimmed.length < 3 || trimmed.length > 30) return false;
    if (!SLUG_REGEX.test(trimmed)) return false;

    const existing = await ctx.db
      .query('leagues')
      .withIndex('by_slug', (q) => q.eq('slug', trimmed))
      .unique();

    return !existing;
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

    const leagueId = await ctx.db.insert('leagues', {
      name,
      slug,
      description: description || undefined,
      password,
      visibility,
      createdBy: viewer._id,
      season: 2026,
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

    await ctx.db.insert('leagueMembers', {
      leagueId: league._id,
      userId: viewer._id,
      role: 'member',
      joinedAt: Date.now(),
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
        .collect();
      const adminCount = admins.filter((m) => m.role === 'admin').length;
      const memberCount = admins.length;

      if (adminCount === 1 && memberCount > 1) {
        throw new Error(
          'You are the last admin. Promote another member before leaving.',
        );
      }
    }

    await ctx.db.delete(membership._id);
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
    if (!league) throw new Error('League not found');

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

    if (args.visibility !== undefined) {
      patch.visibility = args.visibility;
      if (args.visibility === 'public') {
        patch.password = undefined;
      }
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
    if (!league) throw new Error('League not found');
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
    if (!membership) throw new Error('User is not a member');
    if (membership.role === 'admin')
      throw new Error('User is already an admin');

    await ctx.db.patch(membership._id, { role: 'admin' });
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
        .collect();
      const adminCount = admins.filter((m) => m.role === 'admin').length;
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
    if (!membership) throw new Error('User is not a member');
    if (membership.role === 'member')
      throw new Error('User is already a member');

    await ctx.db.patch(membership._id, { role: 'member' });
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
    if (!membership) throw new Error('User is not a member');

    await ctx.db.delete(membership._id);
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
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.leagueId);
  },
});

/**
 * One-off migration: set visibility to 'private' for any league that doesn't have it.
 * Run once from Convex dashboard or: npx convex run leagues:migrateLeagueVisibility
 * Run this after deploying so the function exists on the deployment.
 */
export const migrateLeagueVisibility = mutation({
  args: {},
  handler: async (ctx) => {
    const leagues = await ctx.db.query('leagues').collect();
    const now = Date.now();
    let patched = 0;
    for (const league of leagues) {
      const visibility = (league as { visibility?: 'private' | 'public' })
        .visibility;
      if (visibility === undefined) {
        await ctx.db.patch(league._id, {
          visibility: 'private',
          updatedAt: now,
        });
        patched += 1;
      }
    }
    return { patched, total: leagues.length };
  },
});
