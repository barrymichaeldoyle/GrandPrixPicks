import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { Flag } from 'lucide-react';

import { InlineLoader } from '@/components/InlineLoader';
import { formatCalendarDate } from '@/lib/date';

type AdminRacesTabProps = {
  races: Array<Doc<'races'>> | undefined;
  upcomingRaces: Array<Doc<'races'>>;
  lockedRaces: Array<Doc<'races'>>;
  finishedRaces: Array<Doc<'races'>>;
};

export function AdminRacesTab({
  races,
  upcomingRaces,
  lockedRaces,
  finishedRaces,
}: AdminRacesTabProps) {
  return (
    <>
      <div className="mb-8">
        <h2 className="mb-1 text-xl font-semibold text-white">
          Races & Results
        </h2>
        <p className="text-sm text-slate-400">
          Publish session classifications for each race.
        </p>
      </div>

      {races === undefined ? (
        <InlineLoader />
      ) : (
        <div className="space-y-8">
          {lockedRaces.length > 0 && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Awaiting Results ({lockedRaces.length})
              </h3>
              <div className="space-y-2">
                {lockedRaces.map((race) => (
                  <Link
                    key={race._id}
                    to="/admin/races/$raceId"
                    params={{ raceId: race._id }}
                    className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/50"
                  >
                    <div>
                      <span className="text-sm text-slate-500">
                        Round {race.round}
                      </span>
                      <h4 className="font-medium text-white">{race.name}</h4>
                    </div>
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-400">
                      Publish Results
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {upcomingRaces.length > 0 && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                Upcoming ({upcomingRaces.length})
              </h3>
              <div className="space-y-2">
                {upcomingRaces.map((race) => (
                  <Link
                    key={race._id}
                    to="/admin/races/$raceId"
                    params={{ raceId: race._id }}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/50"
                  >
                    <div>
                      <span className="text-sm text-slate-500">
                        Round {race.round}
                      </span>
                      <h4 className="font-medium text-white">{race.name}</h4>
                    </div>
                    <span
                      className="text-sm text-slate-400"
                      suppressHydrationWarning
                    >
                      {formatCalendarDate(race.raceStartAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {finishedRaces.length > 0 && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                Completed ({finishedRaces.length})
              </h3>
              <div className="space-y-2">
                {finishedRaces.map((race) => (
                  <Link
                    key={race._id}
                    to="/admin/races/$raceId"
                    params={{ raceId: race._id }}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/50"
                  >
                    <div>
                      <span className="text-sm text-slate-500">
                        Round {race.round}
                      </span>
                      <h4 className="font-medium text-white">{race.name}</h4>
                    </div>
                    <span className="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-400">
                      Completed
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {races.length === 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
              <Flag className="mx-auto mb-4 h-16 w-16 text-slate-600" />
              <h3 className="mb-2 text-xl font-semibold text-white">
                No races
              </h3>
              <p className="text-slate-400">
                Races are managed outside this interface.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
