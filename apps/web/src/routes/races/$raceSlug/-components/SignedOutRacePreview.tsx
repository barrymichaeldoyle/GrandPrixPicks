import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Trophy } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { Button } from '@/components/Button/Button';
import { pickPool, type RosterDriver } from '@/lib/roster';
import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from '@/integrations/clerk/runtime-control';

type DriverRecord = RosterDriver;

/**
 * The signed-out view of an upcoming race. Search engines and first-time
 * visitors never boot Clerk's client SDK, so this gives that audience real,
 * crawlable content (the driver grid) plus a single, obvious way to start
 * playing. It renders entirely from loader data so it appears in the
 * server-rendered HTML.
 *
 * The primary CTA opens the Top 5 picker directly (try-before-signup): visitors
 * build their picks first and only sign in to save them. A secondary link keeps
 * returning users one tap from signing in.
 *
 * That secondary link goes through `requestSignIn`, not Clerk's `SignInButton`:
 * `/races/*` is a Clerk-free route, so there is no provider on the page for a
 * Clerk component to find and mounting one threw the whole route into the error
 * boundary for exactly the audience this preview exists to serve.
 */
export function SignedOutRacePreview({
  race,
  drivers,
  onStartPicks,
}: {
  race: Doc<'races'>;
  drivers: DriverRecord[];
  onStartPicks: () => void;
}) {
  // The roster arrives with `includeNotRacing`, so a driver who has lost the
  // seat for this round is in it, carrying `drivers.team` (their *current*
  // team) as a fallback. That is right for resolving a saved pick and wrong
  // here: this strip is who is in a car, and unfiltered it put Verstappen,
  // Hadjar and Lawson in the same Red Bull for Madrid.
  const teams = groupByTeam(pickPool(drivers));
  const { requestSignIn } = useClerkRuntimeControl();
  const warmHandlers = useClerkWarmHandlers();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent/25 bg-accent-muted/10 p-5 text-center sm:p-6">
        <Trophy className="mx-auto mb-3 h-9 w-9 text-accent" />
        <h2 className="text-lg font-semibold text-text sm:text-xl">
          Predict the {race.name} top 5
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
          Rank five drivers for each session. Free to play. No account needed
          until you save.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <Button size="md" rightIcon={ArrowRight} onClick={onStartPicks}>
            Make your picks
          </Button>
          <button
            type="button"
            {...warmHandlers}
            onClick={() => requestSignIn()}
            className="text-xs font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Already playing? Sign in
          </button>
        </div>
      </div>

      {drivers.length > 0 && (
        <section aria-label="Driver grid" className="space-y-2">
          <h2 className="text-sm font-semibold text-text-muted">
            {race.season} driver grid
          </h2>
          {/* Flat rows on the page background: a card per team holding
              bordered driver chips was two nested borders and ran a
              thousand pixels tall on a phone. */}
          <ul className="grid grid-cols-1 border-t border-border sm:grid-cols-2 sm:gap-x-8">
            {teams.map(({ team, drivers: teamDrivers }) => (
              <li
                key={team}
                className="flex items-center justify-between gap-3 border-b border-border py-2"
              >
                <span className="min-w-0 truncate text-sm text-text-muted">
                  {team}
                </span>
                <span className="flex shrink-0 gap-2">
                  {teamDrivers.map((driver) => (
                    <DriverBadge
                      key={driver._id}
                      code={driver.code}
                      team={driver.team}
                      displayName={driver.displayName}
                      number={driver.number}
                      nationality={driver.nationality}
                      size="md"
                    />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-text-muted">
        Following the season?{' '}
        <Link
          to="/f1-standings"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          See the {race.season} F1 championship standings
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Group the roster by team, preserving first-seen order (the roster arrives
 * sorted by driver name, so teams surface in a stable order). Team-less drivers
 * fall under an "Unassigned" bucket rather than being dropped.
 *
 * Takes the racing subset only: see the call site.
 */
function groupByTeam(
  drivers: DriverRecord[],
): { team: string; drivers: DriverRecord[] }[] {
  const order: string[] = [];
  const byTeam = new Map<string, DriverRecord[]>();

  for (const driver of drivers) {
    const team = driver.team ?? 'Unassigned';
    if (!byTeam.has(team)) {
      byTeam.set(team, []);
      order.push(team);
    }
    byTeam.get(team)?.push(driver);
  }

  return order.map((team) => ({ team, drivers: byTeam.get(team) ?? [] }));
}
