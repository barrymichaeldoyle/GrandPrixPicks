import { describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  USER_NOTIFICATION_BATCH_SIZE,
  sendPredictionRemindersBatchCore,
} from './notifications';

function raceId(id: string): Id<'races'> {
  return id as Id<'races'>;
}

type MockUser = {
  _id: Id<'users'>;
  clerkUserId: string;
  email?: string;
  timezone?: string;
  locale?: string;
  emailPredictionReminders?: boolean;
};

function emptyAsyncQuery<T>() {
  return {
    async *[Symbol.asyncIterator]() {
      const rows: T[] = [];
      for (const row of rows) {
        yield row;
      }
    },
  };
}

describe('sendPredictionRemindersBatchCore', () => {
  it('schedules email batches and a continuation when more users remain', async () => {
    const users: MockUser[] = Array.from(
      { length: USER_NOTIFICATION_BATCH_SIZE },
      (_, index) => ({
        _id: `u${index + 1}` as Id<'users'>,
        clerkUserId: `clerk_${String(index + 1).padStart(3, '0')}`,
        email: `user${index + 1}@example.com`,
      }),
    );

    const runAfter = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      db: {
        get: vi.fn(async (id: Id<'races'>) => ({
          _id: id,
          name: 'Bahrain Grand Prix',
          slug: 'bahrain-2026',
          round: 1,
          season: 2026,
          status: 'upcoming',
          raceStartAt: Date.now() + 86_400_000,
          predictionLockAt: Date.now() + 80_000_000,
        })),
        query: vi.fn((table: string) => {
          if (table === 'predictions') {
            return {
              withIndex: () => emptyAsyncQuery<{
                userId: Id<'users'>;
              }>(),
            };
          }

          if (table === 'users') {
            return {
              withIndex: (
                _indexName: string,
                _builder?: (q: { gt: (field: string, value: string) => unknown }) => unknown,
              ) => ({
                take: async (limit: number) => users.slice(0, limit),
              }),
            };
          }

          throw new Error(`Unexpected table ${table}`);
        }),
      },
      scheduler: { runAfter },
    };

    const result = await sendPredictionRemindersBatchCore(ctx as never, {
      raceId: raceId('race_1'),
    });

    expect(result).toEqual({
      recipientCount: USER_NOTIFICATION_BATCH_SIZE,
      batchesScheduled: USER_NOTIFICATION_BATCH_SIZE / 50,
      done: false,
    });
    expect(runAfter).toHaveBeenCalledTimes(
      USER_NOTIFICATION_BATCH_SIZE / 50 + 1,
    );
    expect(runAfter).toHaveBeenNthCalledWith(
      1,
      0,
      internal.emails.sendReminderEmails.sendBatch,
      expect.objectContaining({
        recipients: expect.arrayContaining([
          expect.objectContaining({ email: 'user1@example.com' }),
        ]),
        raceName: 'Bahrain Grand Prix',
      }),
    );
    expect(runAfter).toHaveBeenLastCalledWith(
      0,
      'notifications:sendPredictionRemindersBatch',
      {
        raceId: raceId('race_1'),
        startAfter: users.at(-1)!.clerkUserId,
        recipientCount: USER_NOTIFICATION_BATCH_SIZE,
        batchesScheduled: USER_NOTIFICATION_BATCH_SIZE / 50,
      },
    );
  });
});
