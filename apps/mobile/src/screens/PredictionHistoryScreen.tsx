import { SESSION_LABELS_SHORT } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FlagImage } from '../components/ui/FlagImage';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { PageHero } from '../components/ui/PageHero';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import type { ProfileStackParamList } from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PredictionHistory'>;

type BreakdownItem = {
  driverId: ConvexId<'drivers'>;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
};

type Pick = { driverId: ConvexId<'drivers'>; code: string };

type SessionData = {
  picks: Pick[];
  points: number | null;
  breakdown: BreakdownItem[] | null;
  submittedAt: number;
  isHidden: boolean;
};

type Weekend = {
  raceId: ConvexId<'races'>;
  raceSlug: string;
  raceName: string;
  raceRound: number;
  raceStatus: string;
  raceDate: number;
  hasSprint: boolean;
  sessions: Record<SessionType, SessionData | null>;
  totalPoints: number;
  hasScores: boolean;
  submittedAt: number;
};

const SESSION_ORDER_REGULAR: SessionType[] = ['quali', 'race'];
const SESSION_ORDER_SPRINT: SessionType[] = [
  'sprint_quali',
  'sprint',
  'quali',
  'race',
];

function pointColor(points: number): string {
  if (points >= 5) {
    return colors.success;
  }
  if (points >= 3) {
    return colors.accent;
  }
  if (points >= 1) {
    return colors.warning;
  }
  return colors.textMuted;
}

export function PredictionHistoryScreen({ route }: Props) {
  const { convexEnabled } = useMobileConfig();
  const { username } = route.params;

  const profile = useQuery(
    api.users.getProfileByUsername,
    convexEnabled ? { username } : 'skip',
  );
  const me = useQuery(api.users.me, convexEnabled ? {} : 'skip');
  const history = useQuery(
    api.predictions.getUserPredictionHistory,
    convexEnabled && profile
      ? { userId: profile._id as ConvexId<'users'> }
      : 'skip',
  );

  if (!convexEnabled) {
    return (
      <View style={styles.screen}>
        <PageHero title="Picks history" />
        <EmptyState
          body="Configure Convex to view picks history."
          icon="cloud-offline-outline"
          title="Not connected"
        />
      </View>
    );
  }

  if (profile === undefined || history === undefined) {
    return <LoadingScreen />;
  }

  if (profile === null) {
    return (
      <View style={styles.screen}>
        <PageHero title="Picks history" />
        <EmptyState
          body="That player doesn’t exist."
          icon="person-outline"
          title="User not found"
        />
      </View>
    );
  }

  const isOwner = me ? profile._id === me._id : false;
  const displayName = profile.displayName ?? profile.username ?? username;
  const weekends = history as Weekend[];

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={weekends}
      keyExtractor={(item) => String(item.raceId)}
      ListEmptyComponent={
        <EmptyState
          body={
            isOwner
              ? 'Your picks will show up here once you make your first prediction.'
              : `${displayName} hasn’t submitted any predictions yet.`
          }
          icon="documents-outline"
          title="No picks yet"
        />
      }
      ListHeaderComponent={
        <PageHero
          subtitle={
            isOwner
              ? 'Every weekend you’ve picked, with scoring.'
              : `Picks made by @${profile.username ?? username}.`
          }
          title="Picks history"
        />
      }
      renderItem={({ item }) => <WeekendCard weekend={item} />}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    />
  );
}

function WeekendCard({ weekend }: { weekend: Weekend }) {
  const sessionOrder = weekend.hasSprint
    ? SESSION_ORDER_SPRINT
    : SESSION_ORDER_REGULAR;
  const sessions = sessionOrder
    .map((type) => ({ type, data: weekend.sessions[type] }))
    .filter(
      (s): s is { type: SessionType; data: SessionData } => s.data !== null,
    );
  const raceDate = new Date(weekend.raceDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <FlagImage raceSlug={weekend.raceSlug} />
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {weekend.raceName}
          </Text>
          <Text style={styles.cardMeta}>
            Round {weekend.raceRound} · {raceDate}
          </Text>
        </View>
        {weekend.hasScores ? (
          <View style={styles.totalPill}>
            <Ionicons color={colors.accent} name="trophy" size={11} />
            <Text style={styles.totalPillText}>{weekend.totalPoints} pts</Text>
          </View>
        ) : (
          <Badge variant="neutral">PENDING</Badge>
        )}
      </View>

      {sessions.map(({ type, data }) => (
        <SessionRow data={data} key={`${weekend.raceId}-${type}`} type={type} />
      ))}
    </View>
  );
}

function SessionRow({
  type,
  data,
}: {
  type: SessionType;
  data: SessionData;
}) {
  if (data.isHidden) {
    return (
      <View style={styles.sessionRow}>
        <Text style={styles.sessionLabel}>{SESSION_LABELS_SHORT[type]}</Text>
        <Text style={styles.sessionHidden}>
          <Ionicons color={colors.textMuted} name="lock-closed" size={10} />{' '}
          Hidden until lock
        </Text>
      </View>
    );
  }

  // If we have a breakdown (scored), render colored pills per pick
  if (data.breakdown && data.breakdown.length > 0) {
    const codeByDriverId = new Map(data.picks.map((p) => [p.driverId, p.code]));
    const sortedBreakdown = [...data.breakdown].sort(
      (a, b) => a.predictedPosition - b.predictedPosition,
    );
    return (
      <View style={styles.sessionBlock}>
        <View style={styles.sessionBlockHeader}>
          <Text style={styles.sessionLabel}>{SESSION_LABELS_SHORT[type]}</Text>
          {data.points != null ? (
            <Text style={styles.sessionPoints}>{data.points} pts</Text>
          ) : null}
        </View>
        <View style={styles.pickGrid}>
          {sortedBreakdown.map((item) => (
            <PickPill
              code={codeByDriverId.get(item.driverId) ?? '???'}
              key={item.predictedPosition}
              position={item.predictedPosition}
              points={item.points}
            />
          ))}
        </View>
      </View>
    );
  }

  // Unscored picks (race not yet finished)
  return (
    <View style={styles.sessionBlock}>
      <View style={styles.sessionBlockHeader}>
        <Text style={styles.sessionLabel}>{SESSION_LABELS_SHORT[type]}</Text>
        <Text style={styles.sessionPending}>Not yet scored</Text>
      </View>
      <View style={styles.pickGrid}>
        {data.picks.map((pick, index) => (
          <PickPill
            code={pick.code}
            key={`${pick.driverId}-${index}`}
            position={index + 1}
          />
        ))}
      </View>
    </View>
  );
}

function PickPill({
  position,
  code,
  points,
}: {
  position: number;
  code: string;
  points?: number;
}) {
  const color = points != null ? pointColor(points) : colors.textMuted;
  return (
    <View
      style={[
        styles.pickPill,
        { borderColor: points != null ? color : colors.border },
      ]}
    >
      <Text style={styles.pickPos}>P{position}</Text>
      <Text style={styles.pickCode}>{code}</Text>
      {points != null ? (
        <Text style={[styles.pickPoints, { color }]}>+{points}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
    padding: 12,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pickCode: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.35)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickPoints: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  pickPos: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  sessionBlock: {
    gap: 6,
  },
  sessionBlockHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionHidden: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  sessionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sessionPending: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  sessionPoints: {
    color: colors.accent,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalPill: {
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  totalPillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
});
