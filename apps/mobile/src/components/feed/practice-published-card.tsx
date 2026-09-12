import { PRACTICE_SESSION_LABELS } from '@grandprixpicks/shared/practice';
import { useState } from 'react';

import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { Pressable, Text, View } from '../../tw';
import { CompactPracticeRow } from '../races/CompactPracticeRow';
import { PracticeResultsSheet } from '../races/practice-results-sheet';
import { Card } from '../ui/Card';
import { formatRelativeTime } from './helpers';
import type { FeedEvent } from './types';

/** Web shows the classification's scoring-relevant top; the sheet has the rest. */
const COLLAPSED_ROWS = 6;

export function PracticePublishedCard({ event }: { event: FeedEvent }) {
  const [open, setOpen] = useState(false);
  const results = useQuery(
    api.practiceResults.getPracticeResultsForRace,
    event.raceId ? { raceId: event.raceId } : 'skip',
  );
  const result = results?.find(
    (item) => item.sessionType === event.practiceSessionType,
  );
  const sessionLabel = event.practiceSessionType
    ? PRACTICE_SESSION_LABELS[event.practiceSessionType]
    : 'Practice';

  return (
    <Card>
      {/*
        The session named in full, as web names it. This used to be
        `sessionType.toUpperCase()`, so the feed said "FP1" while every other
        surface in the product said "Free Practice 1".
      */}
      <Text className="text-foreground text-base font-semibold">
        {event.raceName} · {sessionLabel} results
      </Text>
      <Text className="text-muted text-xs">
        {formatRelativeTime(event.createdAt)}
      </Text>
      {result ? (
        <>
          <View>
            {result.entries.slice(0, COLLAPSED_ROWS).map((entry, index) => (
              <View key={entry.driverNumber}>
                {/* Web separates these rows with `divide-y`; a hairline between
                    siblings is the same rule written out. */}
                {index > 0 ? <View className="h-px bg-border" /> : null}
                <CompactPracticeRow entry={entry} />
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            className="min-h-11 items-center justify-center border-t border-border py-2"
            onPress={() => setOpen(true)}
          >
            {/* Muted, like web's: it is a way to see more, not the point of
                the card. */}
            <Text className="text-muted text-sm">View full results</Text>
          </Pressable>
          <PracticeResultsSheet
            competitive={{}}
            hasSprint={false}
            onClose={() => setOpen(false)}
            practice={[result]}
            predictionSession="quali"
            raceSlug={event.raceSlug ?? ''}
            visible={open}
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
