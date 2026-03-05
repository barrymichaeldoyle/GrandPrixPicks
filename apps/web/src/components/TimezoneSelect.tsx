import { useEffect, useRef, useState } from 'react';

const detectedTimezone =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

/** Curated list of common timezones (searchable by name or GMT offset) */
const COMMON_TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Istanbul',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Africa/Johannesburg',
  'Africa/Cairo',
];

function getTimezoneOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value ?? '';
  } catch {
    return '';
  }
}

function formatTimezoneParts(tz: string): { name: string; offset: string } {
  const offset = getTimezoneOffset(tz);
  const name = tz.replace(/_/g, ' ');
  return { name, offset };
}

function formatTimezoneLabel(tz: string): string {
  const { name, offset } = formatTimezoneParts(tz);
  return offset ? `${name} (${offset})` : name;
}

export function TimezoneSelect({
  value,
  onChange,
}: {
  value?: string;
  onChange: (timezone: string | undefined) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const timezonesWithLabels = COMMON_TIMEZONES.map((tz) => ({
    tz,
    label: formatTimezoneLabel(tz),
  }));

  const displayValue = value ?? detectedTimezone;

  const filtered = filter.trim()
    ? timezonesWithLabels.filter(({ tz, label: lbl }) => {
        const lower = filter.toLowerCase();
        return (
          tz.toLowerCase().includes(lower) || lbl.toLowerCase().includes(lower)
        );
      })
    : timezonesWithLabels;

  // Include current value if not in curated list (e.g. saved custom or browser default)
  const filteredTimezones =
    displayValue &&
    !COMMON_TIMEZONES.includes(displayValue) &&
    !filtered.some(({ tz }) => tz === displayValue)
      ? [
          { tz: displayValue, label: formatTimezoneLabel(displayValue) },
          ...filtered,
        ]
      : filtered;

  const displayParts = formatTimezoneParts(displayValue);
  const isUsingDefault = value === undefined || value === detectedTimezone;

  function close() {
    setOpen(false);
    setFilter('');
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) {
        return;
      }
      close();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium text-text">Timezone</label>
        <div className="pr-2 leading-none">
          {isUsingDefault ? (
            <span className="text-xs text-text-muted">Browser default</span>
          ) : (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-xs text-accent hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
            >
              Reset to browser default
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-page px-3 py-2 text-left text-text focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        >
          <span>{displayParts.name}</span>
          {displayParts.offset && (
            <span className="shrink-0 text-text-muted">
              {displayParts.offset}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
            <div className="sticky top-0 border-b border-border bg-surface p-2">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search (e.g. London, GMT+2)..."
                autoFocus
                className="w-full rounded border border-border bg-page px-2 py-1.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
            {filteredTimezones.map(({ tz }) => {
              const { name, offset } = formatTimezoneParts(tz);
              return (
                <button
                  key={tz}
                  type="button"
                  onClick={() => {
                    onChange(tz);
                    close();
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted ${
                    tz === displayValue
                      ? 'bg-accent/10 font-medium text-accent'
                      : 'text-text'
                  }`}
                >
                  <span>{name}</span>
                  {offset && (
                    <span className="shrink-0 text-text-muted">{offset}</span>
                  )}
                </button>
              );
            })}
            {filteredTimezones.length === 0 && (
              <p className="px-3 py-2 text-sm text-text-muted">
                No timezones found
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
