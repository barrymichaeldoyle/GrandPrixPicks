import type { Doc, Id } from '@convex-generated/dataModel';

import { InlineLoader } from '@/components/InlineLoader';
import { formatCalendarDate } from '@/lib/date';

export interface AdminPredictionStatus {
  race: {
    _id: Id<'races'>;
    name: string;
    round: number;
    hasSprint: boolean;
  };
  requiredSessions: ('quali' | 'sprint_quali' | 'sprint' | 'race')[];
  totals: {
    totalUsers: number;
    usersStarted: number;
    usersCompleted: number;
    usersPending: number;
    h2hUsersStarted: number;
    h2hUsersCompleted: number;
    h2hUsersPending: number;
  };
  users: {
    userId: Id<'users'>;
    username: string | null;
    displayName: string | null;
    email: string | null;
    completedSessions: number;
    requiredSessionCount: number;
    hasStarted: boolean;
    hasCompleted: boolean;
    latestSubmittedAt: number | null;
    h2hCompletedSessions: number;
    h2hHasStarted: boolean;
    h2hHasCompleted: boolean;
    h2hLatestSubmittedAt: number | null;
  }[];
}

type AdminUsersTabProps = {
  races: Doc<'races'>[] | undefined;
  selectedRaceId: Id<'races'> | null;
  onSelectRace: (raceId: Id<'races'>) => void;
  predictionStatus: AdminPredictionStatus | undefined;
  onSendReminders: (raceId: Id<'races'>) => Promise<void>;
  sendingReminders: boolean;
};

export function AdminUsersTab({
  races,
  selectedRaceId,
  onSelectRace,
  predictionStatus,
  onSendReminders,
  sendingReminders,
}: AdminUsersTabProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">
          User Prediction Status
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          See which users have completed predictions for a race weekend.
        </p>

        <div className="mt-4">
          <label
            htmlFor="admin-users-race"
            className="mb-2 block text-xs font-medium tracking-wide text-slate-400 uppercase"
          >
            Race
          </label>
          <select
            id="admin-users-race"
            value={selectedRaceId ?? ''}
            onChange={(e) => onSelectRace(e.target.value as Id<'races'>)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 focus:outline-none"
          >
            {(races ?? []).map((race) => (
              <option key={race._id} value={race._id}>
                R{race.round} · {race.name}
              </option>
            ))}
          </select>
        </div>

        {selectedRaceId && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <p className="mb-3 text-sm text-slate-400">
              Send reminder emails now to users who haven&apos;t submitted their
              Top 5 picks, and H2H nudges to users who finished Top 5 but not
              H2H.
            </p>
            <button
              type="button"
              disabled={sendingReminders}
              onClick={() => onSendReminders(selectedRaceId)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingReminders ? 'Sending…' : 'Send Reminders Now'}
            </button>
          </div>
        )}
      </div>

      {selectedRaceId && predictionStatus === undefined ? (
        <InlineLoader />
      ) : predictionStatus ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-xs tracking-wide text-slate-400 uppercase">
                Total Users
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {predictionStatus.totals.totalUsers}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-xs tracking-wide text-slate-400 uppercase">
                Top 5 Done
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">
                {predictionStatus.totals.usersCompleted}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-xs tracking-wide text-slate-400 uppercase">
                H2H Done
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">
                {predictionStatus.totals.h2hUsersCompleted}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <p className="text-xs tracking-wide text-slate-400 uppercase">
                No Top 5
              </p>
              <p className="mt-1 text-2xl font-semibold text-rose-300">
                {predictionStatus.totals.usersPending}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-white">
                {predictionStatus.race.name} (Round{' '}
                {predictionStatus.race.round})
              </h3>
              <p className="text-xs text-slate-400">
                Required sessions: {predictionStatus.requiredSessions.length}
              </p>
            </div>

            <div className="space-y-2">
              {predictionStatus.users.map((user) => {
                const label =
                  user.displayName ??
                  user.username ??
                  user.email ??
                  'Unnamed user';
                const statusClass = user.hasCompleted
                  ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                  : user.hasStarted
                    ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                    : 'text-rose-300 bg-rose-500/15 border-rose-500/30';
                const statusText = user.hasCompleted
                  ? 'Completed'
                  : user.hasStarted
                    ? 'In Progress'
                    : 'No Picks';

                return (
                  <article
                    key={user.userId}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {label}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {user.username
                            ? `@${user.username}`
                            : (user.email ?? '')}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass}`}
                      >
                        {statusText}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                      <span>
                        Top 5: {user.completedSessions}/
                        {user.requiredSessionCount}
                      </span>
                      {user.latestSubmittedAt ? (
                        <span
                          className="text-slate-400"
                          suppressHydrationWarning
                        >
                          Last update:{' '}
                          {formatCalendarDate(user.latestSubmittedAt)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-300">
                      <span>
                        H2H: {user.h2hCompletedSessions}/
                        {user.requiredSessionCount}
                      </span>
                      <span
                        className={
                          user.h2hHasCompleted
                            ? 'text-emerald-300'
                            : user.h2hHasStarted
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }
                      >
                        {user.h2hHasCompleted
                          ? 'H2H Complete'
                          : user.h2hHasStarted
                            ? 'H2H In Progress'
                            : 'No H2H Picks'}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
