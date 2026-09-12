import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';

const labels: Record<string, string> = {
  fp1: 'Free Practice 1',
  fp2: 'Free Practice 2',
  fp3: 'Free Practice 3',
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};
type LiveEntry = {
  driverNumber: number;
  position: number;
  code: string;
  displayName: string;
  bestLapSeconds: number | null;
};

export function LiveClassificationCard() {
  const live = useQuery(api.liveClassification.current, {});
  if (!live?.entries.length) {
    return null;
  }
  const entries = live.entries as LiveEntry[];
  return (
    <section className="overflow-hidden border border-border bg-surface max-md:border-x-0 md:rounded-sm">
      <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold text-text">{live.raceName}</h3>
          <p className="text-xs text-text-muted">
            {labels[live.sessionType]} as it stands
          </p>
        </div>
        <span className="text-xs font-medium text-accent">Live</span>
      </div>
      <ol className="divide-y divide-border">
        {entries.slice(0, 6).map((entry) => (
          <li
            className="grid grid-cols-[2rem_3rem_1fr_auto] items-center gap-2 px-3 py-1.5"
            key={entry.driverNumber}
          >
            <span className="gpp-mono text-xs text-text-muted">
              P{entry.position}
            </span>
            <span className="gpp-mono text-sm font-semibold text-text">
              {entry.code}
            </span>
            <span className="truncate text-sm text-text-muted">
              {entry.displayName}
            </span>
            <span className="gpp-mono text-xs text-text-muted">
              {entry.bestLapSeconds == null
                ? ''
                : entry.bestLapSeconds.toFixed(3)}
            </span>
          </li>
        ))}
      </ol>
      <p className="border-t border-border px-3 py-2 text-xs text-text-muted">
        Live timing can change, including after the flag.
      </p>
    </section>
  );
}
