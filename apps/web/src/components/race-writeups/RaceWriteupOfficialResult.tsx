import { DriverBadge } from '@/components/DriverBadge';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';

type OfficialResultDriver = {
  position: number;
  driverId: string;
  code: string;
  displayName: string;
  team: string | null;
  number: number | null;
  nationality: string | null;
};

export type OfficialResultSession = {
  session: SessionType;
  classification: OfficialResultDriver[];
};

function ResultTable({ session, classification }: OfficialResultSession) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-text">
        {SESSION_LABELS[session]}
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse">
          <caption className="sr-only">
            Official {SESSION_LABELS[session]} top five
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="w-14 px-3 py-1.5 text-left text-xs font-medium text-text-muted"
              >
                Pos
              </th>
              <th
                scope="col"
                className="px-3 py-1.5 text-left text-xs font-medium text-text-muted"
              >
                Driver
              </th>
            </tr>
          </thead>
          <tbody>
            {classification.map((driver) => (
              <tr
                key={driver.driverId}
                className="border-b border-border last:border-0"
              >
                <th
                  scope="row"
                  className="gpp-mono w-14 px-3 py-1.5 text-left text-xs font-semibold text-text-muted"
                >
                  P{driver.position}
                </th>
                <td className="min-w-0 px-3 py-1.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <DriverBadge
                      code={driver.code}
                      displayName={driver.displayName}
                      team={driver.team}
                      number={driver.number}
                      nationality={driver.nationality}
                      size="sm"
                      prerenderTooltip={false}
                    />
                    <span className="min-w-0 truncate text-sm text-text">
                      {driver.displayName}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * The official top five of each scored session, on a finished write-up.
 *
 * `race-writeup-lifecycle.md` asks a finished page to show the result rather
 * than point at it, and until now this page did the pointing: the closing panel
 * said the result was on the race page and sent the reader away. A reader who
 * arrives from search after Sunday wants the number, and an archive that
 * withholds the one fact it is an archive of is a page with nothing on it.
 *
 * Five rows, not the full classification. The game is a Top 5 and the
 * consensus table below it is a Top 5, so a twenty-two row table here would be
 * the only thing on the page at a different scale, and the positions past
 * fifth are on the race page and on every site that covers the sport.
 *
 * Loader data, never a client subscription: this is the content a crawler is
 * here for, so it has to be in the SSR HTML. See `SessionConsensus`, which
 * renders directly beneath it for the same reason.
 */
export function RaceWriteupOfficialResult({
  sessions,
  venueName,
}: {
  sessions: OfficialResultSession[];
  venueName: string;
}) {
  const scored = sessions.filter((entry) => entry.classification.length > 0);
  if (scored.length === 0) {
    return null;
  }

  return (
    <div className="mt-10 max-w-3xl border-t border-border pt-6">
      <h2 className="font-title text-xl font-semibold text-text">
        How {venueName} finished
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        The official classification, which is what picks are scored against.
      </p>
      {scored.map((entry) => (
        <ResultTable key={entry.session} {...entry} />
      ))}
    </div>
  );
}
