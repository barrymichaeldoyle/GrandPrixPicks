import { useState } from 'react';

import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { Pressable, Text, View } from '../../tw';
import { PracticeResultsSheet } from '../races/practice-results-sheet';
import { Card } from '../ui/Card';
import { formatRelativeTime } from './helpers';
import type { FeedEvent } from './types';

function timing(seconds: number | undefined, position: number) {
  if (seconds === undefined) {
    return '—';
  }
  if (position !== 1) {
    return `+${seconds.toFixed(3)}`;
  }
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
}

export function PracticePublishedCard({ event }: { event: FeedEvent }) {
  const [open, setOpen] = useState(false);
  const results = useQuery(
    api.practiceResults.getPracticeResultsForRace,
    event.raceId ? { raceId: event.raceId } : 'skip',
  );
  const result = results?.find(
    (item) => item.sessionType === event.practiceSessionType,
  );
  return (
    <Card>
      <Text className="text-foreground text-base font-semibold">
        {event.raceName} · {event.practiceSessionType?.toUpperCase()} results
      </Text>
      <Text className="text-muted text-xs">
        {formatRelativeTime(event.createdAt)}
      </Text>
      {result ? (
        <>
          {result.entries.slice(0, 6).map((entry) => (
            <View
              key={entry.driverNumber}
              className="flex-row items-center gap-3 py-1"
            >
              <Text selectable className="text-muted w-7 text-sm">
                P{entry.position}
              </Text>
              <Text
                selectable
                className="text-foreground flex-1 text-sm"
                numberOfLines={1}
              >
                {entry.displayName}
              </Text>
              <Text
                selectable
                className="text-foreground text-sm"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {timing(
                  entry.position === 1
                    ? entry.bestLapSeconds
                    : entry.gapToLeaderSeconds,
                  entry.position,
                )}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpen(true)}
            className="min-h-11 items-center justify-center border-t border-border py-2"
          >
            <Text className="text-foreground text-sm font-semibold">
              View full results
            </Text>
          </Pressable>
          <PracticeResultsSheet
            visible={open}
            onClose={() => setOpen(false)}
            practice={[result]}
            competitive={{}}
            predictionSession="quali"
            hasSprint={false}
            raceSlug={event.raceSlug ?? ''}
          />
        </>
      ) : (
        <Text className="text-muted text-sm">
          {results === undefined
            ? 'Loading practice results…'
            : 'Practice results are unavailable.'}
        </Text>
      )}
    </Card>
  );
}
