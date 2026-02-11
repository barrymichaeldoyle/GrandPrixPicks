import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Check, Loader2, Save, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { SessionType } from '../../../lib/sessions';
import { getSessionsForWeekend, SESSION_LABELS } from '../../../lib/sessions';
import { NotFoundPage } from '../../__root';

export const Route = createFileRoute('/admin/races/$raceId')({
  component: AdminRaceDetailPage,
});

function AdminRaceDetailPage() {
  const { raceId } = Route.useParams();
  const typedRaceId = raceId as Id<'races'>;
  const isAdmin = useQuery(api.users.amIAdmin);
  const race = useQuery(api.races.getRace, { raceId: typedRaceId });
  const drivers = useQuery(api.drivers.listDrivers);

  const [selectedSession, setSelectedSession] = useState<SessionType>('race');

  const existingResult = useQuery(api.results.getResultForRace, {
    raceId: typedRaceId,
    sessionType: selectedSession,
  });

  const [selectedDrivers, setSelectedDrivers] = useState<Array<Id<'drivers'>>>(
    [],
  );
  const [dnfDriverIds, setDnfDriverIds] = useState<Array<Id<'drivers'>>>([]);
  const publishResults = useMutation(api.results.adminPublishResults);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Reset selected drivers when session changes or when result loads
  useEffect(() => {
    if (existingResult?.classification) {
      // Use full classification if it exists
      setSelectedDrivers(existingResult.classification);
      setDnfDriverIds(existingResult.dnfDriverIds ?? []);
    } else {
      setSelectedDrivers([]);
      setDnfDriverIds([]);
    }
    setPublishSuccess(false);
  }, [existingResult, selectedSession]);

  if (isAdmin === undefined || race === undefined || drivers === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return <NotFoundPage />;
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-white">Race not found</p>
        </div>
      </div>
    );
  }

  // Determine which sessions are available for this race
  const availableSessions = getSessionsForWeekend(race.hasSprint ?? false);

  const toggleDriver = (driverId: Id<'drivers'>) => {
    setPublishSuccess(false);
    if (selectedDrivers.includes(driverId)) {
      setSelectedDrivers(selectedDrivers.filter((id) => id !== driverId));
      setDnfDriverIds(dnfDriverIds.filter((id) => id !== driverId));
    } else if (selectedDrivers.length < drivers.length) {
      setSelectedDrivers([...selectedDrivers, driverId]);
    }
  };

  const moveDriver = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedDrivers.length) return;

    const newDrivers = [...selectedDrivers];
    [newDrivers[index], newDrivers[newIndex]] = [
      newDrivers[newIndex],
      newDrivers[index],
    ];
    setSelectedDrivers(newDrivers);
    setPublishSuccess(false);
  };

  const toggleClassified = (driverId: Id<'drivers'>) => {
    setDnfDriverIds((current) =>
      current.includes(driverId)
        ? current.filter((id) => id !== driverId) // mark as classified
        : [...current, driverId], // mark as DNF
    );
  };

  const handlePublish = async () => {
    if (selectedDrivers.length !== drivers.length) return;

    setIsPublishing(true);
    try {
      await publishResults({
        raceId: typedRaceId,
        classification: selectedDrivers,
        sessionType: selectedSession,
        dnfDriverIds,
      });
      setPublishSuccess(true);
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedDriverData = selectedDrivers
    .map((id) => drivers.find((d) => d._id === id))
    .filter(Boolean);

  const availableDrivers = drivers.filter(
    (d) => !selectedDrivers.includes(d._id),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/admin"
          className="mb-8 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={20} />
          Back to Admin
        </Link>

        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-500">
                Round {race.round} - {race.season}
              </span>
              <h1 className="mt-1 text-2xl font-bold text-white">
                {race.name}
              </h1>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                race.status === 'upcoming'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : race.status === 'locked'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-500/20 text-slate-400'
              }`}
            >
              {race.status}
            </span>
          </div>
        </div>

        {/* Publish Results Section */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">
              {existingResult ? 'Update Results' : 'Publish Results'}
            </h2>
          </div>

          {/* Session Type Tabs */}
          <div className="mb-6">
            <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-900/50 p-1">
              {availableSessions.map((session) => (
                <button
                  key={session}
                  onClick={() => setSelectedSession(session)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    selectedSession === session
                      ? 'bg-yellow-500 text-black'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {SESSION_LABELS[session]}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-6 text-slate-400">
            Build the full classification for {SESSION_LABELS[selectedSession]} in
            order (P1 to P{drivers.length}). This powers both scoring and
            Head-to-Head results.
          </p>

          {/* Selected drivers (full grid) */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-slate-400">
              Classification (P1–P{drivers.length})
            </h3>
            <div className="space-y-2">
              {Array.from({ length: drivers.length }).map((_, index) => {
                const driver = selectedDriverData[index];
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      driver
                        ? 'border-slate-600 bg-slate-700/50'
                        : 'border-dashed border-slate-700 bg-slate-800/30'
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20 text-sm font-bold text-yellow-400">
                      P{index + 1}
                    </span>
                    {driver ? (
                      <>
                        <div className="flex-1">
                          <span className="font-medium text-white">
                            {driver.displayName}
                          </span>
                          <span className="ml-2 text-sm text-slate-500">
                            {driver.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveDriver(index, 'up')}
                            disabled={index === 0}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-600 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveDriver(index, 'down')}
                            disabled={index >= selectedDrivers.length - 1}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-600 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => toggleDriver(driver._id)}
                            className="ml-2 rounded p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
                          >
                            ✕
                          </button>
                        </div>
                        <label className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          <input
                            type="checkbox"
                            checked={!dnfDriverIds.includes(driver._id)}
                            onChange={() => toggleClassified(driver._id)}
                            className="h-3 w-3 rounded border-slate-500 bg-slate-800 text-yellow-400"
                          />
                          Classified (finished / classified in results)
                        </label>
                      </>
                    ) : (
                      <span className="text-sm text-slate-500">
                        Select a driver from below
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Publish button */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={handlePublish}
              disabled={
                selectedDrivers.length !== drivers.length || isPublishing
              }
              className="flex items-center gap-2 rounded-lg bg-yellow-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isPublishing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Publishing...
                </>
              ) : publishSuccess ? (
                <>
                  <Check size={20} />
                  Published!
                </>
              ) : (
                <>
                  <Save size={20} />
                  Publish {SESSION_LABELS[selectedSession]} Results
                </>
              )}
            </button>
            {selectedDrivers.length < drivers.length && (
              <span className="text-sm text-slate-400">
                Select {drivers.length - selectedDrivers.length} more driver
                {drivers.length - selectedDrivers.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Available drivers */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-slate-400">
              Select Drivers
            </h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {availableDrivers.map((driver) => (
                <button
                  key={driver._id}
                  onClick={() => toggleDriver(driver._id)}
                  disabled={selectedDrivers.length >= drivers.length}
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 p-2 transition-colors hover:border-yellow-500/50 hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-sm font-bold text-cyan-400">
                    {driver.code}
                  </span>
                  <span className="text-xs text-slate-500">
                    {driver.familyName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
