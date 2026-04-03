import { internal } from '../_generated/api';
import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { syncUserToStandings } from './standings';

export function getIdentityKeys(identity: {
  tokenIdentifier?: string;
  subject?: string;
}): { primary: string; legacy: string | null } | null {
  const primary = identity.tokenIdentifier ?? identity.subject;
  if (!primary) {
    return null;
  }

  return {
    primary,
    legacy: identity.subject && identity.subject !== primary ? identity.subject : null,
  };
}

async function findViewerByIdentity(
  ctx: QueryCtx | MutationCtx,
  keys: { primary: string; legacy: string | null },
): Promise<Doc<'users'> | null> {
  const current = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', keys.primary))
    .unique();

  if (current) {
    return current;
  }

  if (!keys.legacy) {
    return null;
  }

  return await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', keys.legacy!))
    .unique();
}

export async function getViewer(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const keys = getIdentityKeys(identity);
  if (!keys) {
    return null;
  }

  return await findViewerByIdentity(ctx, keys);
}

export async function getOrCreateViewer(
  ctx: MutationCtx,
  regional?: { timezone?: string; locale?: string },
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const identityKeys = getIdentityKeys(identity);
  if (!identityKeys) {
    return null;
  }

  const clerkUserId = identityKeys.primary;
  const now = Date.now();

  // Extract user data from Clerk identity
  const rawEmail =
    identity.email ??
    (Array.isArray(identity.emailAddresses) && identity.emailAddresses[0]);
  const email = typeof rawEmail === 'string' ? rawEmail : undefined;
  const displayName =
    identity.name ??
    identity.nickname ??
    (identity.givenName && identity.familyName
      ? `${identity.givenName} ${identity.familyName}`
      : undefined);
  const username = (identity as { preferredUsername?: string })
    .preferredUsername;
  const avatarUrl = identity.pictureUrl;

  const existing = await findViewerByIdentity(ctx, identityKeys);

  if (existing) {
    // Sync user data from Clerk if it has changed.
    // Only overwrite fields that Clerk actually provides (not undefined)
    // to avoid clearing data we already have.
    // Only sync email and avatarUrl from Clerk for existing users.
    // displayName and username are now user-managed via updateProfile.
    const patch: Partial<
      Pick<
        Doc<'users'>,
        | 'clerkUserId'
        | 'email'
        | 'avatarUrl'
        | 'timezone'
        | 'locale'
        | 'updatedAt'
      >
    > = {};
    if (existing.clerkUserId !== clerkUserId) {
      patch.clerkUserId = clerkUserId;
    }
    if (email !== undefined && existing.email !== email) {
      patch.email = email;
    }
    if (avatarUrl !== undefined && existing.avatarUrl !== avatarUrl) {
      patch.avatarUrl = avatarUrl;
    }
    // Only auto-detect timezone/locale if user hasn't set them yet
    if (regional?.timezone && !existing.timezone) {
      patch.timezone = regional.timezone;
    }
    if (regional?.locale && !existing.locale) {
      patch.locale = regional.locale;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = now;
      await ctx.db.patch(existing._id, patch);
      // Sync avatar changes to denormalized standings
      if (patch.avatarUrl) {
        await syncUserToStandings(ctx, existing._id, {
          avatarUrl: patch.avatarUrl,
        });
      }
      return (await ctx.db.get(existing._id)) ?? existing;
    }

    return existing;
  }

  const userId = await ctx.db.insert('users', {
    clerkUserId,
    email,
    displayName,
    username,
    avatarUrl,
    timezone: regional?.timezone,
    locale: regional?.locale,
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.scheduler.runAfter(
    60 * 60 * 1000,
    internal.notifications.sendSignupPredictionNudgeForUser,
    { userId },
  );

  const inserted = await ctx.db.get(userId);
  return inserted ?? null;
}

export function requireViewer(viewer: Doc<'users'> | null): Doc<'users'> {
  if (!viewer) {
    throw new Error('Not authenticated');
  }
  return viewer;
}

export function requireAdmin(viewer: { isAdmin?: boolean } | null): void {
  if (!viewer?.isAdmin) {
    throw new Error('Admin only');
  }
}

export function isAdmin(viewer: { isAdmin?: boolean } | null): boolean {
  return viewer?.isAdmin === true;
}
