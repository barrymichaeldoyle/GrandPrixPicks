import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';

import type { ConvexId } from '../../integrations/convex/api';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { FlagImage } from '../ui/FlagImage';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { RevButton } from './RevButton';

type ScoredPick = {
  code: string;
  team?: string;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
};

type H2HScore = {
  correctPicks: number;
  totalPicks: number;
  points: number;
};

export type FeedEvent = {
  _id: ConvexId<'feedEvents'>;
  type:
    | 'score_published'
    | 'session_locked'
    | 'joined_league'
    | 'streak_milestone';
  userId: ConvexId<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  // score_published
  raceId?: ConvexId<'races'>;
  sessionType?: string;
  points?: number;
  raceName?: string;
  raceSlug?: string;
  // enriched picks
  picks?: ScoredPick[];
  h2hScore?: H2HScore | null;
  // joined_league
  leagueName?: string;
  leagueSlug?: string;
  // streak_milestone
  streakCount?: number;
  revCount: number;
  createdAt: number;
  viewerHasReved: boolean;
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function pickColor(points: number): string {
  if (points === 5) {
    return colors.success;
  }
  if (points === 3) {
    return colors.warning;
  }
  if (points === 1) {
    return '#fb923c';
  } // orange
  return colors.textMuted;
}

function EventHeader({ event }: { event: FeedEvent }) {
  const name = event.displayName ?? event.username ?? 'Unknown';
  return (
    <View className="flex-row items-center gap-2.5">
      <Avatar imageUrl={event.avatarUrl} name={name} size="md" />
      <View className="flex-1 gap-0.5">
        <Text className="text-foreground text-sm font-bold">{name}</Text>
        <Text className="text-muted text-xs">
          {formatRelativeTime(event.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function ScorePublishedCard({ event }: { event: FeedEvent }) {
  const sessionLabel = event.sessionType
    ? SESSION_LABELS[event.sessionType as keyof typeof SESSION_LABELS]
    : null;
  const pts = event.points ?? 0;
  const scoreColor =
    pts >= 20 ? colors.success : pts >= 10 ? colors.warning : colors.error;

  return (
    <Card>
      <EventHeader event={event} />

      <View className="flex-row items-center gap-2">
        {event.raceSlug ? <FlagImage raceSlug={event.raceSlug} /> : null}
        <View className="flex-1 gap-0.5">
          {event.raceName ? (
            <Text
              className="text-foreground text-[13px] font-semibold"
              numberOfLines={1}
            >
              {event.raceName}
            </Text>
          ) : null}
          {sessionLabel ? (
            <Text className="text-muted text-[11px]">{sessionLabel}</Text>
          ) : null}
        </View>
        <View
          className="rounded-md border px-2.5 py-1"
          style={{ borderColor: scoreColor }}
        >
          <Text
            className="text-base font-extrabold"
            style={{ color: scoreColor }}
          >
            {pts}
            <Text className="text-muted text-[11px]">/25</Text>
          </Text>
        </View>
      </View>

      {event.picks && event.picks.length > 0 ? (
        <View className="py-0.5">
          {event.picks.map((pick) => (
            <View
              className="flex-row items-center gap-2 py-[3px]"
              key={pick.predictedPosition}
            >
              <Text className="text-muted w-6 text-xs font-semibold">
                P{pick.predictedPosition}
              </Text>
              <Text className="text-foreground flex-1 text-[13px] font-semibold">
                {pick.code}
              </Text>
              <View
                className="rounded-full px-2 py-0.5"
                style={{
                  backgroundColor:
                    pick.points > 0
                      ? pickColor(pick.points) + '33'
                      : colors.surfaceMuted,
                }}
              >
                <Text
                  className="text-[11px] font-bold"
                  style={{
                    color:
                      pick.points > 0
                        ? pickColor(pick.points)
                        : colors.textMuted,
                  }}
                >
                  {pick.points}pt{pick.points !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center pt-0.5">
        <RevButton
          feedEventId={event._id}
          revCount={event.revCount}
          viewerHasReved={event.viewerHasReved}
        />
      </View>
    </Card>
  );
}

function SimpleEventCard({
  event,
  description,
}: {
  event: FeedEvent;
  description: string;
}) {
  return (
    <Card>
      <EventHeader event={event} />
      <Text className="text-muted text-sm leading-5">{description}</Text>
      <View className="flex-row items-center pt-0.5">
        <RevButton
          feedEventId={event._id}
          revCount={event.revCount}
          viewerHasReved={event.viewerHasReved}
        />
      </View>
    </Card>
  );
}

export function FeedEventCard({
  event,
  onPress,
}: {
  event: FeedEvent;
  onPress?: () => void;
}) {
  const inner = (() => {
    if (event.type === 'score_published') {
      return <ScorePublishedCard event={event} />;
    }
    if (event.type === 'session_locked') {
      const sessionLabel = event.sessionType
        ? SESSION_LABELS[event.sessionType as keyof typeof SESSION_LABELS]
        : 'session';
      const description = `Locked their picks for ${sessionLabel}${event.raceName ? ` · ${event.raceName}` : ''}`;
      return <SimpleEventCard event={event} description={description} />;
    }
    if (event.type === 'joined_league') {
      const description = `Joined ${event.leagueName ?? 'a league'}`;
      return <SimpleEventCard event={event} description={description} />;
    }
    if (event.type === 'streak_milestone') {
      const description = `🔥 ${event.streakCount}-race prediction streak`;
      return <SimpleEventCard event={event} description={description} />;
    }
    return null;
  })();

  if (!inner || !onPress) {
    return inner;
  }
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}
