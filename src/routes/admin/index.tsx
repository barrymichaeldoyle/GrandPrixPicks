import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Flag, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { api } from '../../../convex/_generated/api';
import { NotFoundPage } from '../__root';

export const Route = createFileRoute('/admin/')({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: 'Admin | Grand Prix Picks' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
});

function AdminPage() {
  const isAdmin = useQuery(api.users.amIAdmin);
  const races = useQuery(api.races.listRaces, { season: 2026 });
  const [activeTab, setActiveTab] = useState<'races' | 'utilities'>('races');

  if (isAdmin === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return <NotFoundPage />;
  }

  const upcomingRaces = races?.filter((r) => r.status === 'upcoming') ?? [];
  const lockedRaces = races?.filter((r) => r.status === 'locked') ?? [];
  const finishedRaces = races?.filter((r) => r.status === 'finished') ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-white">Admin</h1>
          <p className="text-slate-400">
            Internal tools for races, results, and more.
          </p>
        </div>

        {/* Tabs */}
        <div
          className="mb-8 flex gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-1"
          role="tablist"
          aria-label="Admin sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'races'}
            onClick={() => setActiveTab('races')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'races'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Races & Results
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'utilities'}
            onClick={() => setActiveTab('utilities')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'utilities'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Utilities
          </button>
        </div>

        {activeTab === 'utilities' && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 text-slate-300">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Admin utilities
            </h2>
            <p className="text-sm text-slate-400">
              This area is reserved for future tools like user management,
              seeding helpers, and debugging panels.
            </p>
          </div>
        )}

        {activeTab === 'races' && (
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Locked races - need results */}
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
                            <h4 className="font-medium text-white">
                              {race.name}
                            </h4>
                          </div>
                          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-400">
                            Publish Results
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Upcoming races */}
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
                            <h4 className="font-medium text-white">
                              {race.name}
                            </h4>
                          </div>
                          <span className="text-sm text-slate-400">
                            {new Date(race.raceStartAt).toLocaleDateString()}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Finished races */}
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
                            <h4 className="font-medium text-white">
                              {race.name}
                            </h4>
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
        )}
      </div>
    </div>
  );
}
