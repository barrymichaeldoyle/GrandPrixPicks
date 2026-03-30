import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { Flag } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Button } from '@/components/Button';
import { InlineLoader } from '@/components/InlineLoader';
import { formatCalendarDate } from '@/lib/date';

type ScenarioSummary = {
  scenario: string | null;
  namespace: string;
  description: string | null;
  actor: {
    clerkUserId: string;
    email: string | null;
    displayName: string | null;
  } | null;
  race: {
    raceId: string;
    slug: string;
    name: string;
    status: string;
    hasSprint: boolean;
  } | null;
  state: {
    signedIn: boolean;
    weekendType: string;
    racePhase: string;
    predictionShape: string;
    resultsShape: string;
    hasRank: boolean;
  } | null;
  data: {
    userCount: number;
    raceCount: number;
    predictionCount: number;
    resultSessions: string[];
    scoreSessions: Array<{
      userId: string;
      sessionType: string;
      points: number;
    }>;
  };
  routes: {
    webRaceDetail: string;
    webLeaderboard: string;
  } | null;
};

type ScenarioName =
  | 'race_upcoming_signed_in_no_picks'
  | 'race_upcoming_signed_in_complete'
  | 'race_upcoming_signed_in_top5_only'
  | 'race_upcoming_signed_in_complete_h2h'
  | 'race_locked_signed_in_no_picks'
  | 'race_locked_signed_in_complete_no_results'
  | 'race_locked_signed_in_complete_h2h_no_results'
  | 'race_partial_results_standard'
  | 'race_partial_results_sprint'
  | 'race_finished_scored_standard'
  | 'race_finished_scored_sprint'
  | 'race_finished_scored_h2h_standard';

function defaultNamespaceForScenario(scenario: ScenarioName) {
  return `scenario__${scenario}`;
}

function AdminScenarioPanel() {
  const scenarios = useQuery(api.testingScenarios.listScenariosAdmin, {});
  const applyScenario = useMutation(api.testingScenarios.applyScenarioAdmin);
  const clearScenario = useMutation(api.testingScenarios.clearScenarioAdmin);

  const initialScenario =
    (scenarios?.[0]?.name as ScenarioName | undefined) ??
    'race_upcoming_signed_in_no_picks';
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioName>(initialScenario);
  const [namespace, setNamespace] = useState(
    defaultNamespaceForScenario(initialScenario),
  );
  const [lastSummary, setLastSummary] = useState<ScenarioSummary | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleScenarioChange(next: ScenarioName) {
    setSelectedScenario(next);
    setNamespace((current) =>
      current === defaultNamespaceForScenario(selectedScenario)
        ? defaultNamespaceForScenario(next)
        : current,
    );
  }

  async function handleApply(openAfterApply = false) {
    setIsApplying(true);
    setErrorMessage(null);
    try {
      const summary = await applyScenario({
        scenario: selectedScenario,
        namespace: namespace.trim() || undefined,
        resetFirst: true,
      });
      const typedSummary = summary as ScenarioSummary;
      setLastSummary(typedSummary);
      if (openAfterApply && typedSummary.routes?.webRaceDetail) {
        window.location.assign(typedSummary.routes.webRaceDetail);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to apply scenario.',
      );
    } finally {
      setIsApplying(false);
    }
  }

  async function handleClear() {
    if (!namespace.trim()) {
      setErrorMessage('Namespace is required to clear a scenario.');
      return;
    }
    setIsClearing(true);
    setErrorMessage(null);
    try {
      await clearScenario({ namespace: namespace.trim() });
      setLastSummary(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to clear scenario.',
      );
    } finally {
      setIsClearing(false);
    }
  }

  const selectedScenarioDefinition =
    scenarios?.find((scenario) => scenario.name === selectedScenario) ?? null;
  const latestState = lastSummary?.state ?? null;
  const latestRace = lastSummary?.race ?? null;
  const latestActor = lastSummary?.actor ?? null;
  const latestData = lastSummary?.data ?? null;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Testing Scenarios</h3>
        <p className="text-sm text-slate-400">
          Apply a named race-detail scenario, then jump straight into the app to
          verify the flow.
        </p>
      </div>

      {scenarios === undefined ? (
        <InlineLoader />
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Scenario
            </span>
            <select
              value={selectedScenario}
              onChange={(event) =>
                handleScenarioChange(event.target.value as ScenarioName)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {scenarios.map((scenario) => (
                <option key={scenario.name} value={scenario.name}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </label>

          {selectedScenarioDefinition ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm">
              <p className="font-medium text-white">
                {selectedScenarioDefinition.name}
              </p>
              <p className="mt-1 text-slate-400">
                {selectedScenarioDefinition.description}
              </p>
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Namespace
            </span>
            <input
              value={namespace}
              onChange={(event) => setNamespace(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={isApplying}
              onClick={() => void handleApply()}
            >
              Apply Scenario
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={isApplying}
              onClick={() => void handleApply(true)}
            >
              Apply And Open
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={isClearing}
              onClick={() => void handleClear()}
            >
              Clear Namespace
            </Button>
            {lastSummary?.routes?.webRaceDetail ? (
              <Button asChild variant="text" size="sm">
                <Link
                  to="/races/$raceSlug"
                  params={{
                    raceSlug:
                      lastSummary.routes.webRaceDetail.split('/races/')[1] ?? '',
                  }}
                >
                  Open Race Page
                </Link>
              </Button>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-400">{errorMessage}</p>
          ) : null}

          {lastSummary ? (
            <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm">
              <p className="font-medium text-white">
                {lastSummary.scenario ?? 'Scenario applied'}
              </p>
              {lastSummary.description ? (
                <p className="mt-1 text-slate-400">{lastSummary.description}</p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Expected State
                  </p>
                  {latestState ? (
                    <div className="mt-2 space-y-1 text-slate-300">
                      <p>Weekend: {latestState.weekendType}</p>
                      <p>Phase: {latestState.racePhase}</p>
                      <p>Top 5/H2H: {latestState.predictionShape}</p>
                      <p>Results: {latestState.resultsShape}</p>
                      <p>Race rank visible: {latestState.hasRank ? 'yes' : 'no'}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-slate-400">No state summary.</p>
                  )}
                </div>

                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Seeded Entities
                  </p>
                  {latestRace ? (
                    <div className="mt-2 space-y-1 text-slate-300">
                      <p>Race: {latestRace.name}</p>
                      <p>Status: {latestRace.status}</p>
                      <p>Sprint weekend: {latestRace.hasSprint ? 'yes' : 'no'}</p>
                      <p>Slug: {latestRace.slug}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-slate-400">No race seeded.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Viewer Context
                  </p>
                  {latestActor ? (
                    <div className="mt-2 space-y-1 text-slate-300">
                      <p>Name: {latestActor.displayName ?? 'Unknown'}</p>
                      <p>Clerk ID: {latestActor.clerkUserId}</p>
                      <p>Email: {latestActor.email ?? 'n/a'}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-slate-400">No actor summary.</p>
                  )}
                </div>

                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Published Sessions
                  </p>
                  {latestData ? (
                    <div className="mt-2 space-y-1 text-slate-300">
                      <p>Predictions: {latestData.predictionCount}</p>
                      <p>
                        Result sessions:{' '}
                        {latestData.resultSessions.length > 0
                          ? latestData.resultSessions.join(', ')
                          : 'none'}
                      </p>
                      <p>Score rows: {latestData.scoreSessions.length}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-slate-400">No data summary.</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Namespace: {lastSummary.namespace}
              </p>
              {lastSummary.routes?.webRaceDetail ? (
                <p className="text-xs text-slate-500">
                  Route: {lastSummary.routes.webRaceDetail}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function AdminRaceRow({
  race,
  borderClassName,
  children,
}: {
  race: Doc<'races'>;
  borderClassName: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/admin/races/$raceId"
      params={{ raceId: race._id }}
      className={`flex items-center justify-between rounded-lg bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/50 ${borderClassName}`}
    >
      <div>
        <span className="text-sm text-slate-500">Round {race.round}</span>
        <h4 className="font-medium text-white">{race.name}</h4>
      </div>
      {children}
    </Link>
  );
}

function AdminRaceSection({
  title,
  count,
  headingClassName,
  dotClassName,
  races,
  renderRowSuffix,
  rowBorderClassName,
}: {
  title: string;
  count: number;
  headingClassName: string;
  dotClassName: string;
  races: Doc<'races'>[];
  renderRowSuffix: (race: Doc<'races'>) => ReactNode;
  rowBorderClassName: string;
}) {
  if (races.length === 0) {
    return null;
  }

  return (
    <section>
      <h3
        className={`mb-4 flex items-center gap-2 text-lg font-semibold ${headingClassName}`}
      >
        <span className={`h-2 w-2 rounded-full ${dotClassName}`}></span>
        {title} ({count})
      </h3>
      <div className="space-y-2">
        {races.map((race) => (
          <AdminRaceRow
            key={race._id}
            race={race}
            borderClassName={rowBorderClassName}
          >
            {renderRowSuffix(race)}
          </AdminRaceRow>
        ))}
      </div>
    </section>
  );
}

type AdminRacesTabProps = {
  races: Doc<'races'>[] | undefined;
  upcomingRaces: Doc<'races'>[];
  lockedRaces: Doc<'races'>[];
  finishedRaces: Doc<'races'>[];
  cancelledRaces: Doc<'races'>[];
};

export function AdminRacesTab({
  races,
  upcomingRaces,
  lockedRaces,
  finishedRaces,
  cancelledRaces,
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
          <AdminScenarioPanel />

          <AdminRaceSection
            title="Awaiting Results"
            count={lockedRaces.length}
            headingClassName="text-amber-400"
            dotClassName="bg-amber-400"
            races={lockedRaces}
            rowBorderClassName="border border-amber-500/30"
            renderRowSuffix={() => (
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-400">
                Publish Results
              </span>
            )}
          />

          <AdminRaceSection
            title="Upcoming"
            count={upcomingRaces.length}
            headingClassName="text-emerald-400"
            dotClassName="bg-emerald-400"
            races={upcomingRaces}
            rowBorderClassName="border border-slate-700"
            renderRowSuffix={(race) => (
              <span className="text-sm text-slate-400" suppressHydrationWarning>
                {formatCalendarDate(race.raceStartAt)}
              </span>
            )}
          />

          <AdminRaceSection
            title="Completed"
            count={finishedRaces.length}
            headingClassName="text-slate-400"
            dotClassName="bg-slate-400"
            races={finishedRaces}
            rowBorderClassName="border border-slate-700"
            renderRowSuffix={() => (
              <span className="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-400">
                Completed
              </span>
            )}
          />

          <AdminRaceSection
            title="Called Off"
            count={cancelledRaces.length}
            headingClassName="text-red-400"
            dotClassName="bg-red-400"
            races={cancelledRaces}
            rowBorderClassName="border border-red-500/30"
            renderRowSuffix={() => (
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm text-red-400">
                Cancelled
              </span>
            )}
          />

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
