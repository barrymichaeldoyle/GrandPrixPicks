import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';

import type { ConvexId } from '../../integrations/convex/api';
import { Pressable, Text, View } from '../../tw';
import { Avatar } from '../ui/Avatar';
import { Numeral } from '../ui/Numeral';
import type { FeedEvent } from './FeedEventCard';
import { FeedEventCard } from './FeedEventCard';

export type SessionHeader = {
  raceName: string;
  sessionType: string;
  raceSlug?: string;
  top5: Array<{
    code: string;
    displayName: string;
    team?: string;
  }>;
};

function eventTotalPoints(event: FeedEvent): number {
  return (event.points ?? 0) + (event.h2hScore?.points ?? 0);
}

/**
 * One race session's feed events under a shared header. Scored sessions
 * render as a ranked mini-leaderboard (mirrors web's SessionGroup); locked
 * sessions stack the individual pick cards.
 */
export function SessionGroupCard({
  session,
  events,
  viewerId,
  onPressEvent,
}: {
  session: SessionHeader;
  events: FeedEvent[];
  viewerId?: ConvexId<'users'>;
  onPressEvent: (event: FeedEvent) => void;
}) {
  const sessionLabel =
    SESSION_LABELS_FULL[session.sessionType as SessionType] ??
    session.sessionType;

  const isScored =
    session.top5.length > 0 &&
    events.every((e) => e.type === 'score_published' && e.points !== undefined);

  if (!isScored) {
    return (
      <View className="gap-2">
        <Text className="text-muted px-0.5 text-[10px] font-extrabold uppercase">
          {session.raceName} · {sessionLabel}
        </Text>
        <View className="gap-3">
          {events.map((event) => (
            <FeedEventCard
              event={event}
              key={event._id}
              onPress={() => onPressEvent(event)}
            />
          ))}
        </View>
      </View>
    );
  }

  // Rank by total points (Top 5 + H2H), descending; ties share a rank.
  const ranked = [...events].sort(
    (a, b) => eventTotalPoints(b) - eventTotalPoints(a),
  );
  const showRanks = ranked.length > 1;
  let lastPoints: number | null = null;
  let lastRank = 0;

  return (
    <View className="gap-2">
      <Text className="text-muted px-0.5 text-[10px] font-extrabold uppercase">
        {session.raceName} · {sessionLabel} results
      </Text>
      <View className="flex-row flex-wrap gap-2.5 px-0.5">
        {session.top5.map((driver, i) => (
          <Text className="text-foreground text-xs font-bold" key={driver.code}>
            <Text className="text-muted text-[10px] font-extrabold">
              {i + 1}
            </Text>{' '}
            {driver.code}
          </Text>
        ))}
      </View>
      <View className="overflow-hidden rounded-lg border border-border">
        {ranked.map((event, i) => {
          const pts = eventTotalPoints(event);
          if (pts !== lastPoints) {
            lastRank = i + 1;
            lastPoints = pts;
          }
          const isViewer = Boolean(viewerId && event.userId === viewerId);
          return (
            <Pressable
              key={event._id}
              onPress={() => onPressEvent(event)}
              className={`flex-row items-center gap-2.5 px-2.5 py-2.5 ${
                isViewer ? 'bg-accent/10' : ''
              } ${i < ranked.length - 1 ? 'border-b border-border' : ''}`}
            >
              {showRanks ? (
                <Numeral
                  style={{ textAlign: 'center', width: 22 }}
                  tone={isViewer ? 'accent' : 'muted'}
                  variant="small"
                >
                  {lastRank}
                </Numeral>
              ) : null}
              <Avatar
                imageUrl={event.avatarUrl}
                name={event.displayName ?? event.username ?? '?'}
                size="sm"
              />
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text
                    className="text-foreground shrink text-sm font-semibold"
                    numberOfLines={1}
                  >
                    {event.displayName ?? event.username}
                  </Text>
                  {isViewer ? (
                    <Text className="text-foreground overflow-hidden rounded-full bg-accent px-1.5 py-px text-[9px] font-extrabold">
                      YOU
                    </Text>
                  ) : null}
                </View>
                <Text className="text-muted mt-px text-[11px]">
                  {event.points ?? 0} Top 5
                  {event.h2hScore ? ` · ${event.h2hScore.points} H2H` : ''}
                </Text>
              </View>
              <View className="min-w-10 items-end">
                <Numeral variant="small">{pts}</Numeral>
                <Text className="text-muted text-[9px] font-semibold uppercase">
                  pts
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
