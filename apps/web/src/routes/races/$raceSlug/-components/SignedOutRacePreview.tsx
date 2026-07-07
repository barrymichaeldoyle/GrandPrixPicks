import { SignInButton } from '@clerk/react';
import type { Doc } from '@convex-generated/dataModel';
import { ArrowRight, Trophy } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { Button } from '@/components/Button/Button';

type DriverRecord = Doc<'drivers'>;

/**
 * The signed-out view of an upcoming race. Search engines and first-time
 * visitors never boot Clerk's client SDK, so the interactive Top 5 picker is
 * out of reach for them — this gives that audience real, crawlable content (the
 * driver grid) plus a single, obvious way to start playing. It renders entirely
 * from loader data so it appears in the server-rendered HTML.
 */
export function SignedOutRacePreview({
  race,
  drivers,
  currentUrl,
}: {
  race: Doc<'races'>;
  drivers: DriverRecord[];
  currentUrl?: string;
}) {
  const teams = groupByTeam(drivers);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-accent/25 bg-accent-muted/10 p-5 text-center sm:p-6">
        <Trophy className="mx-auto mb-3 h-9 w-9 text-accent" />
        <h2 className="text-lg font-semibold text-text sm:text-xl">
          Predict the {race.name} top 5
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
          Rank who you think finishes ahead, call the teammate head-to-heads,
          and score points every session. It's free — each session is worth up
          to 25 points on the season leaderboard.
        </p>
        <div className="mt-4 flex justify-center">
          <SignInButton
            mode="modal"
            fallbackRedirectUrl={currentUrl}
            signUpFallbackRedirectUrl={currentUrl}
          >
            <Button size="md" rightIcon={ArrowRight}>
              Make your free picks
            </Button>
          </SignInButton>
        </div>
      </div>

      {drivers.length > 0 && (
        <section aria-label="Driver grid" className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-text-muted uppercase">
            {race.season} Driver Grid
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {teams.map(({ team, drivers: teamDrivers }) => (
              <div
                key={team}
                className="rounded-lg border border-border bg-surface p-3"
              >
                <p className="mb-2 text-xs font-medium text-text-muted">
                  {team}
                </p>
                <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Group the roster by team, preserving first-seen order (the roster arrives
 * sorted by driver name, so teams surface in a stable order). Team-less drivers
 * fall under an "Unassigned" bucket rather than being dropped.
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
