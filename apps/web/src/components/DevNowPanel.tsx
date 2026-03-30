import type { Doc } from '@convex-generated/dataModel';
import { Clock3, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { formatDateTime } from '../lib/date';
import {
  getRaceSessionLockAt,
  getRaceSessionStartAt,
} from '../lib/raceSessions';
import {
  clearDevNow,
  setDevNow,
  useDevNowOverride,
} from '../lib/testing/now';

type Race = Doc<'races'>;

export function DevNowPanel({
  race,
  now,
}: {
  race: Race | null;
  now: number;
}) {
  if (!race) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const overrideNow = useDevNowOverride();
  const presets: Array<{
    label: string;
    timestamp: number;
  }> = [
    {
      label: '5m Before Quali Lock',
      timestamp: getRaceSessionLockAt(race, 'quali') - 5 * 60 * 1000,
    },
    {
      label: '1m After Quali Lock',
      timestamp: getRaceSessionLockAt(race, 'quali') + 60 * 1000,
    },
    {
      label: '5m Before Race Lock',
      timestamp: getRaceSessionLockAt(race, 'race') - 5 * 60 * 1000,
    },
    {
      label: '1m After Race Lock',
      timestamp: getRaceSessionLockAt(race, 'race') + 60 * 1000,
    },
    {
      label: '1h After Race Start',
      timestamp: getRaceSessionStartAt(race, 'race') + 60 * 60 * 1000,
    },
  ];

  return (
    <div
      className="fixed bottom-4 left-4 z-50"
      data-testid="dev-now-panel"
      data-override-active={overrideNow == null ? 'false' : 'true'}
    >
      {isOpen ? (
        <div
          className="w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur"
          data-testid="dev-now-panel-content"
        >
          <div className="mb-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm font-semibold text-text">
                Dev Time Controls
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {overrideNow == null ? (
                  <span data-testid="dev-now-status">
                    <Badge variant="upcoming">Real time</Badge>
                  </span>
                ) : (
                  <span data-testid="dev-now-status">
                    <Badge variant="locked">Override active</Badge>
                  </span>
                )}
                <Button
                  variant="text"
                  size="inline"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-muted/40 p-0 hover:bg-surface-muted"
                  onClick={() => setIsOpen(false)}
                  title="Close dev time controls"
                  data-testid="dev-now-close"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
            <p className="text-xs text-text-muted" data-testid="dev-now-effective">
              Effective now: {formatDateTime(now)}
            </p>
            <p className="truncate text-xs text-text-muted">{race.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => clearDevNow()}
              className="col-span-2"
              data-testid="dev-now-reset"
            >
              Reset To Real Time
            </Button>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="text"
                size="sm"
                className="justify-start rounded-md border border-border bg-surface-muted/50 px-2 py-2 text-left text-xs"
                onClick={() => setDevNow(preset.timestamp)}
                title={formatDateTime(preset.timestamp)}
                data-testid={`dev-now-preset-${preset.label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-lg backdrop-blur transition-colors ${
            overrideNow == null
              ? 'border-border bg-surface/95 text-text hover:bg-surface-muted'
              : 'border-warning/50 bg-warning/12 text-warning hover:bg-warning/18'
          }`}
          title="Open dev time controls"
          data-testid="dev-now-trigger"
        >
          <Clock3 size={16} />
        </button>
      )}
    </div>
  );
}
