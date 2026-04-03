import { describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { startUserDeletion } from './users';

function userId(id: string): Id<'users'> {
  return id as Id<'users'>;
}

describe('startUserDeletion', () => {
  it('patches the user and schedules the first deletion batch', async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const runAfter = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      db: { patch },
      scheduler: { runAfter },
    };

    const result = await startUserDeletion(ctx as never, {
      _id: userId('u1'),
      clerkUserId: 'clerk_user_1',
    });

    expect(result).toEqual({
      scheduled: true,
      alreadyScheduled: false,
    });
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith(
      userId('u1'),
      expect.objectContaining({
        deletingAt: expect.any(Number),
        updatedAt: expect.any(Number),
      }),
    );
    expect(runAfter).toHaveBeenCalledTimes(1);
    expect(runAfter).toHaveBeenCalledWith(
      0,
      internal.users.processUserDeletionBatch,
      expect.objectContaining({
        userId: userId('u1'),
        clerkUserId: 'clerk_user_1',
        step: 'follows_as_follower',
      }),
    );
  });

  it('does not reschedule when deletion is already in progress', async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const runAfter = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      db: { patch },
      scheduler: { runAfter },
    };

    const result = await startUserDeletion(ctx as never, {
      _id: userId('u1'),
      clerkUserId: 'clerk_user_1',
      deletingAt: Date.now(),
    });

    expect(result).toEqual({
      scheduled: false,
      alreadyScheduled: true,
    });
    expect(patch).not.toHaveBeenCalled();
    expect(runAfter).not.toHaveBeenCalled();
  });
});
