import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import { StyleSheet, Text, View } from 'react-native';

import type { ConvexId } from '../../integrations/convex/api';
import { FlagImage } from '../ui/FlagImage';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { RevButton } from './RevButton';
import { colors, radii } from '../../theme/tokens';

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
    <View style={styles.header}>
      <Avatar imageUrl={event.avatarUrl} name={name} size="md" />
      <View style={styles.headerText}>
        <Text style={styles.username}>{name}</Text>
        <Text style={styles.time}>{formatRelativeTime(event.createdAt)}</Text>
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

      <View style={styles.raceRow}>
        {event.raceSlug ? <FlagImage raceSlug={event.raceSlug} /> : null}
        <View style={styles.raceInfo}>
          {event.raceName ? (
            <Text style={styles.raceName} numberOfLines={1}>
              {event.raceName}
            </Text>
          ) : null}
          {sessionLabel ? (
            <Text style={styles.sessionLabel}>{sessionLabel}</Text>
          ) : null}
        </View>
        <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {pts}
            <Text style={styles.scoreMax}>/25</Text>
          </Text>
        </View>
      </View>

      {event.picks && event.picks.length > 0 ? (
        <View style={styles.picks}>
          {event.picks.map((pick) => (
            <View key={pick.predictedPosition} style={styles.pickRow}>
              <Text style={styles.pickPos}>P{pick.predictedPosition}</Text>
              <Text style={styles.pickCode}>{pick.code}</Text>
              <View
                style={[
                  styles.pickPoints,
                  {
                    backgroundColor:
                      pick.points > 0
                        ? pickColor(pick.points) + '33'
                        : colors.surfaceMuted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pickPointsText,
                    {
                      color:
                        pick.points > 0
                          ? pickColor(pick.points)
                          : colors.textMuted,
                    },
                  ]}
                >
                  {pick.points}pt{pick.points !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
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
      <Text style={styles.description}>{description}</Text>
      <View style={styles.footer}>
        <RevButton
          feedEventId={event._id}
          revCount={event.revCount}
          viewerHasReved={event.viewerHasReved}
        />
      </View>
    </Card>
  );
}

export function FeedEventCard({ event }: { event: FeedEvent }) {
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
}

const styles = StyleSheet.create({
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: 2,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  pickCode: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  pickPoints: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pickPointsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pickPos: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 24,
  },
  pickRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 3,
  },
  picks: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  raceInfo: {
    flex: 1,
    gap: 2,
  },
  raceName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  raceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  scoreBadge: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreMax: {
    color: colors.textMuted,
    fontSize: 11,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
  },
  sessionLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
  },
  username: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
