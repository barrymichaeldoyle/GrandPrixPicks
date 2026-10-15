import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import type { FeedEvent } from './FeedItem/types';
import { ScorePublishedItem } from './FeedItem/ScorePublishedItem';
import { Button } from './Button/Button';
import { RaceFlag } from './RaceFlag';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import {
  groupProfileResults,
  type ProfileWeekendResults,
} from '@/lib/profileResults';

function WeekendResults({ weekend }: { weekend: ProfileWeekendResults }) {
  const [expanded, setExpanded] = useState(false);
  const countryCode = weekend.raceSlug
    ? getCountryCodeForRace({ slug: weekend.raceSlug })
    : undefined;
  return (
    <details
      className="group border-b border-border"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
        {countryCode && <RaceFlag countryCode={countryCode} size="sm" />}
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-text">
            {weekend.raceName}
          </span>
          <span className="mt-1 block text-xs text-text-muted">
            {weekend.events.length} session{' '}
            {weekend.events.length === 1 ? 'result' : 'results'}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="gpp-mono block font-semibold text-text">
            {weekend.combinedPoints}
          </span>
          <span className="block text-xs text-text-muted">Combined pts</span>
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 text-text-muted group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      {expanded && (
        <div className="divide-y divide-border">
          {weekend.events.map((event) => (
            <section key={event._id} className="py-4">
              <ScorePublishedItem event={event} hideIdentity />
            </section>
          ))}
        </div>
      )}
    </details>
  );
}

export function ProfileResultHistory({ events }: { events: FeedEvent[] }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const weekends = groupProfileResults(events);
  return (
    <div>
      <div className="border-t border-border">
        {weekends.slice(0, visibleCount).map((weekend) => (
          <WeekendResults key={weekend.key} weekend={weekend} />
        ))}
      </div>
      {visibleCount < weekends.length && (
        <Button
          variant="secondary"
          size="md"
          className="mt-4"
          onClick={() => setVisibleCount((count) => count + 3)}
        >
          Show older weekends
        </Button>
      )}
    </div>
  );
}
