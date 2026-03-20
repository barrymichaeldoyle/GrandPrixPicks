import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { Flag } from 'lucide-react';
import type { ReactNode } from 'react';

import { InlineLoader } from '@/components/InlineLoader';
import { formatCalendarDate } from '@/lib/date';

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
