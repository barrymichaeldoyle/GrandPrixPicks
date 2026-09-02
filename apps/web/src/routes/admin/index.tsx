import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '@/integrations/convex/query';
import { useState } from 'react';

import { AdminBannerTab } from '@/components/admin/AdminBannerTab';
import { AdminCreatorPollTab } from '@/components/admin/AdminCreatorPollTab';
import { AdminRacesTab } from '@/components/admin/AdminRacesTab';
import type { AdminPredictionStatus } from '@/components/admin/AdminUsersTab';
import { AdminUsersTab } from '@/components/admin/AdminUsersTab';
import { PageLoader } from '@/components/PageLoader';

import { NotFoundPage } from '@/routes/__root';

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
  const races = useQuery(api.races.listCurrentSeason)?.races;
  const [activeTab, setActiveTab] = useState<
    'races' | 'users' | 'banner' | 'poll'
  >('races');
  const [selectedRaceId, setSelectedRaceId] = useState<Id<'races'> | null>(
    null,
  );
  const [sendingReminders, setSendingReminders] = useState(false);
  const triggerReminders = useMutation(api.notifications.adminTriggerReminders);

  const upcomingRaces = races?.filter((r) => r.status === 'upcoming') ?? [];
  const lockedRaces = races?.filter((r) => r.status === 'locked') ?? [];
  const finishedRaces = races?.filter((r) => r.status === 'finished') ?? [];
  const cancelledRaces = races?.filter((r) => r.status === 'cancelled') ?? [];
  const defaultSelectedRaceId =
    upcomingRaces.length > 0
      ? upcomingRaces[0]._id
      : lockedRaces.length > 0
        ? lockedRaces[0]._id
        : races && races.length > 0
          ? races[races.length - 1]._id
          : null;

  const effectiveSelectedRaceId = selectedRaceId ?? defaultSelectedRaceId;

  const predictionStatus = useQuery(
    api.users.adminPredictionStatusForRace,
    isAdmin && effectiveSelectedRaceId
      ? { raceId: effectiveSelectedRaceId }
      : 'skip',
  ) as AdminPredictionStatus | undefined;

  if (isAdmin === undefined) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <NotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-white">Admin</h1>
          <p className="text-slate-400">
            Internal tools for races, results, and more.
          </p>
        </div>

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
            aria-selected={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Users
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'banner'}
            onClick={() => setActiveTab('banner')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'banner'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Banner
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'poll'}
            onClick={() => setActiveTab('poll')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'poll'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Creator poll
          </button>
        </div>

        {activeTab === 'poll' ? (
          <AdminCreatorPollTab races={races} />
        ) : activeTab === 'banner' ? (
          <AdminBannerTab />
        ) : activeTab === 'users' ? (
          <AdminUsersTab
            races={races}
            selectedRaceId={effectiveSelectedRaceId}
            onSelectRace={setSelectedRaceId}
            predictionStatus={predictionStatus}
            sendingReminders={sendingReminders}
            onSendReminders={async (raceId) => {
              setSendingReminders(true);
              try {
                await triggerReminders({ raceId });
              } finally {
                setSendingReminders(false);
              }
            }}
          />
        ) : (
          <AdminRacesTab
            races={races}
            upcomingRaces={upcomingRaces}
            lockedRaces={lockedRaces}
            finishedRaces={finishedRaces}
            cancelledRaces={cancelledRaces}
          />
        )}
      </div>
    </div>
  );
}
