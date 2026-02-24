import { createFileRoute } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { Calendar } from 'lucide-react';
import { useMemo } from 'react';

import { api } from '../../../convex/_generated/api';
import { RaceCard } from '../../components/RaceCard';
import { canonicalMeta, ogBaseUrl } from '../../lib/site';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);
const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]['key'];
type NonDefaultStatusFilter = Exclude<StatusFilter, 'all'>;

export const Route = createFileRoute('/races/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { status?: NonDefaultStatusFilter; sprint?: true } => {
    const rawStatus = search.status;
    const status =
      rawStatus === 'inProgress' ||
      rawStatus === 'upcoming' ||
      rawStatus === 'completed'
        ? rawStatus
        : undefined;
    const sprintRaw = search.sprint;
    const sprint =
      sprintRaw === true ||
      sprintRaw === 'true' ||
      sprintRaw === '1' ||
      sprintRaw === '"true"' ||
      sprintRaw === '"1"'
        ? true
        : undefined;
    return { status, sprint };
  },
  component: RacesPage,
  loader: async () => {
    const [races, nextRace] = await Promise.all([
      convex.query(api.races.listRaces, { season: 2026 }),
      convex.query(api.races.getNextRace),
    ]);
    return { races, nextRace };
  },
  head: () => {
    const title = '2026 F1 Race Calendar & Predictions | Grand Prix Picks';
    const description =
      'Browse the full 2026 Formula 1 calendar. Make your top 5 predictions for upcoming Grands Prix, track results, and climb the season leaderboard.';
    const canonical = canonicalMeta('/races');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: `${ogBaseUrl}/og/home.png` },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${ogBaseUrl}/og/home.png` },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function RacesPage() {
  const { races, nextRace } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const statusFilter: StatusFilter = search.status ?? 'all';
  const sprintOnly = search.sprint === true;

  const setFilters = ({
    status,
    sprint,
  }: {
    status: StatusFilter;
    sprint: boolean;
  }) => {
    void navigate({
      to: '.',
      search: (prev) => ({
        ...prev,
        status: status === 'all' ? undefined : status,
        sprint: sprint ? true : undefined,
      }),
    });
  };

  const upcomingRaces = races.filter((r) => r.status === 'upcoming');
  const lockedRaces = races.filter((r) => r.status === 'locked');
  const finishedRaces = races.filter((r) => r.status === 'finished');
  const filtered = useMemo(() => {
    const baseByFilter: Record<StatusFilter, typeof races> = {
      all: races,
      inProgress: lockedRaces,
      upcoming: upcomingRaces,
      completed: finishedRaces,
    };
    const base = baseByFilter[statusFilter];
    return sprintOnly ? base.filter((race) => race.hasSprint) : base;
  }, [
    statusFilter,
    sprintOnly,
    races,
    lockedRaces,
    upcomingRaces,
    finishedRaces,
  ]);
  const hasActiveFilters = statusFilter !== 'all' || sprintOnly;
  const sectionRaces = {
    inProgress:
      statusFilter === 'all'
        ? sprintOnly
          ? lockedRaces.filter((race) => race.hasSprint)
          : lockedRaces
        : filtered,
    upcoming:
      statusFilter === 'all'
        ? sprintOnly
          ? upcomingRaces.filter((race) => race.hasSprint)
          : upcomingRaces
        : filtered,
    completed:
      statusFilter === 'all'
        ? sprintOnly
          ? finishedRaces.filter((race) => race.hasSprint)
          : finishedRaces
        : filtered,
  } as const;

  // When predictions open for a race = previous race's start (same season, round - 1)
  const getPredictionOpenAt = (race: (typeof races)[0]) => {
    if (race.round <= 1) {
      return null;
    }
    const prev = races.find(
      (r) => r.season === race.season && r.round === race.round - 1,
    );
    return prev?.raceStartAt ?? null;
  };

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-8 flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <h1 className="text-3xl font-bold text-text">2026 Season</h1>
          <p className="text-text-muted md:text-base">
            Predict the top 5 finishers for each Grand Prix
          </p>
        </header>
        <div className="mb-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() =>
                setFilters({ status: filter.key, sprint: sprintOnly })
              }
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === filter.key
                  ? 'border-accent/40 bg-accent-muted/40 text-accent'
                  : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text'
              }`}
            >
              {filter.label}{' '}
              <span className="text-xs">
                {filter.key === 'all'
                  ? `(${races.length})`
                  : filter.key === 'inProgress'
                    ? `(${lockedRaces.length})`
                    : filter.key === 'upcoming'
                      ? `(${upcomingRaces.length})`
                      : `(${finishedRaces.length})`}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setFilters({ status: statusFilter, sprint: !sprintOnly })
            }
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              sprintOnly
                ? 'border-accent/40 bg-accent-muted/40 text-accent'
                : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text'
            }`}
          >
            Sprint weekends only
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters({ status: 'all', sprint: false })}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text"
            >
              Reset
            </button>
          )}
        </div>

        {races.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h2 className="mb-2 text-xl font-semibold text-text">
              No races scheduled yet
            </h2>
            <p className="text-text-muted">
              Check back soon for the 2026 race calendar
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sectionRaces.inProgress.length > 0 &&
              (statusFilter === 'all' || statusFilter === 'inProgress') && (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-muted">
                    <span
                      className="h-2 w-2 rounded-full bg-warning"
                      aria-hidden="true"
                    ></span>
                    In Progress ({sectionRaces.inProgress.length})
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sectionRaces.inProgress.map((race) => (
                      <RaceCard key={race._id} race={race} />
                    ))}
                  </div>
                </section>
              )}

            {sectionRaces.upcoming.length > 0 &&
              (statusFilter === 'all' || statusFilter === 'upcoming') && (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-muted">
                    <span
                      className="h-2 w-2 rounded-full bg-success"
                      aria-hidden="true"
                    ></span>
                    Upcoming Races ({sectionRaces.upcoming.length})
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sectionRaces.upcoming.map((race) => (
                      <RaceCard
                        key={race._id}
                        race={race}
                        isNext={nextRace != null && nextRace._id === race._id}
                        predictionOpenAt={getPredictionOpenAt(race)}
                      />
                    ))}
                  </div>
                </section>
              )}

            {sectionRaces.completed.length > 0 &&
              (statusFilter === 'all' || statusFilter === 'completed') && (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-muted">
                    <span
                      className="h-2 w-2 rounded-full bg-text-muted"
                      aria-hidden="true"
                    ></span>
                    Completed ({sectionRaces.completed.length})
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sectionRaces.completed.map((race) => (
                      <RaceCard key={race._id} race={race} />
                    ))}
                  </div>
                </section>
              )}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-muted">
                No races match the current filters. Try removing Sprint-only or
                switching status.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
