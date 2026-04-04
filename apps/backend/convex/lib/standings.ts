import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export const STANDINGS_SYNC_BATCH_SIZE = 200;
export const STANDINGS_SYNC_STEPS = [
  'season_standings',
  'h2h_season_standings',
  'scores',
] as const;

export type StandingsSyncStep = (typeof STANDINGS_SYNC_STEPS)[number];
export type StandingsSyncFields = {
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

export function normalizeStandingsSyncFields(
  fields: StandingsSyncFields,
): StandingsSyncFields {
  const normalized: StandingsSyncFields = {};
  if (fields.username !== undefined) {
    normalized.username = fields.username;
  }
  if (fields.displayName !== undefined) {
    normalized.displayName = fields.displayName;
  }
  if (fields.avatarUrl !== undefined) {
    normalized.avatarUrl = fields.avatarUrl;
  }
  return normalized;
}

export function nextStandingsSyncStep(
  step: StandingsSyncStep,
): StandingsSyncStep | null {
  const currentIndex = STANDINGS_SYNC_STEPS.indexOf(step);
  if (currentIndex < 0 || currentIndex === STANDINGS_SYNC_STEPS.length - 1) {
    return null;
  }
  return STANDINGS_SYNC_STEPS[currentIndex + 1] ?? null;
}

/** Sync denormalized user fields to all standings and score rows for this user. */
export async function syncUserToStandings(
  ctx: MutationCtx,
  userId: Id<'users'>,
  fields: StandingsSyncFields,
) {
  const normalizedFields = normalizeStandingsSyncFields(fields);
  if (Object.keys(normalizedFields).length === 0) {
    return;
  }

  await ctx.scheduler.runAfter(0, internal.users.syncUserToStandingsBatch, {
    userId,
    fields: normalizedFields,
    step: 'season_standings',
    cursor: null,
  });
}
