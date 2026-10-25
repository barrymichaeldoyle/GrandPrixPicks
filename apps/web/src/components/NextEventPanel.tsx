import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';

import { Flag } from '@/components/Flag';
import { useMinuteCountdown } from '@/lib/date';
import { useUserDateFormat } from '@/lib/useUserDateFormat';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import {
  getNextSessionLockAt,
  getWeekendSessionStarts,
} from '@/lib/raceSessions';
import { SESSION_LABELS, type SessionType } from '@/lib/sessions';

/**
 * The next race weekend, as the timing sheet it is.
 *
 * Rendered beside a signed-out gate, where the page's own content is an
 * argument for signing in and the right-hand column was otherwise empty. It is
 * the one thing on that page that is happening whether or not the reader has an
 * account, and it gives the "try a pick" action its deadline.
 *
 * Fetched client-side rather than in a route loader on purpose. A loader would
 * put this query on the SSR path of `/settings` and `/notifications` for signed
 * -in visitors too, who never see this panel. The grid track it sits in is a
 * fixed width, so arriving late moves nothing.
 *
 * No accent anywhere in here. The gate's sign-in button is the one action on
 * the screen, and a countdown is neither an action nor a state.
 */

export function NextEventPanel() {
  const race = useQuery(api.races.getNextRace);
  if (!race) {
    return null;
  }
  return <NextEvent race={race} />;
}

function NextEvent({ race }: { race: NonNullable<RaceDoc> }) {
  const lockAt = getNextSessionLockAt(race);
  // Minute precision on a 30s tick, not `useCountdown`'s seconds: this panel
  // sits on a page where nothing else moves, so a seconds column would be the
  // only motion on screen and pull the eye off the one action.
  const countdown = useMinuteCountdown(lockAt, 'Locked');
  const sessions = getWeekendSessionStarts(race);
  const nextSession = sessions.find((entry) => entry.startAt >= lockAt);
  const countryCode = getCountryCodeForRace(race);
  const circuit = getCircuitForRace(race.slug);

  return (
    <aside
      aria-labelledby="next-event-heading"
      className="border-t border-border pt-4 lg:border-t-0 lg:pt-0"
    >
      <h2 id="next-event-heading" className="gpp-label">
        Next event
      </h2>

      <div className="mt-3 flex items-center gap-2.5">
        {countryCode ? (
          <Flag code={countryCode} size="sm" className="shrink-0" />
        ) : null}
        <p className="font-title text-lg font-medium text-text">{race.name}</p>
      </div>
      <p className="gpp-reading-meta mt-1 text-text-muted">
        Round {race.round}
        {circuit && !race.name.includes(circuit.locality)
          ? ` · ${circuit.locality}`
          : ''}
      </p>

      <div className="mt-4 border-t border-border pt-4">
        <p className="gpp-label">
          {nextSession
            ? `${SESSION_LABELS[nextSession.type]} locks in`
            : 'Locks in'}
        </p>
        {/* Ticks client-side, so the server and the first client frame
            disagree by design. */}
        <p
          suppressHydrationWarning
          className="gpp-mono mt-1 text-2xl text-text"
        >
          {countdown}
        </p>
      </div>

      {sessions.length > 0 ? (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {sessions.map((entry) => (
            <SessionRow
              key={entry.type}
              type={entry.type}
              startAt={entry.startAt}
            />
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

function SessionRow({ type, startAt }: { type: SessionType; startAt: number }) {
  // The viewer's saved timezone and locale when signed in, the device's
  // otherwise, with the server's own values through hydration.
  const { formatDate, formatTime } = useUserDateFormat();
  return (
    <li className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-sm text-text-muted">{SESSION_LABELS[type]}</span>
      <span className="gpp-mono text-xs text-text-muted">
        {formatDate(startAt)} {formatTime(startAt)}
      </span>
    </li>
  );
}

type RaceDoc = ReturnType<typeof useQuery<typeof api.races.getNextRace>>;
