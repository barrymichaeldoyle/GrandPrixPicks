import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { syncUserToStandings } from './standings';

export async function getViewer(ctx: QueryCtx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const clerkUserId = identity.subject;

  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
    .unique();

  return existing ?? null;
}

export async function getOrCreateViewer(
  ctx: MutationCtx,
  regional?: { timezone?: string; locale?: string },
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const clerkUserId = identity.subject;
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

  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
    .unique();

  if (existing) {
    // Sync user data from Clerk if it has changed.
    // Only overwrite fields that Clerk actually provides (not undefined)
    // to avoid clearing data we already have.
    // Only sync email and avatarUrl from Clerk for existing users.
    // displayName and username are now user-managed via updateProfile.
    const patch: Partial<
      Pick<
        Doc<'users'>,
        'email' | 'avatarUrl' | 'timezone' | 'locale' | 'updatedAt'
      >
    > = {};
    if (email !== undefined && existing.email !== email) patch.email = email;
    if (avatarUrl !== undefined && existing.avatarUrl !== avatarUrl)
      patch.avatarUrl = avatarUrl;
    // Only auto-detect timezone/locale if user hasn't set them yet
    if (regional?.timezone && !existing.timezone)
      patch.timezone = regional.timezone;
    if (regional?.locale && !existing.locale) patch.locale = regional.locale;

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
