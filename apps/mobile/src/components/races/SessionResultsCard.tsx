import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { getTeamColor } from '../../lib/teamColors';
import { colors, radii } from '../../theme/tokens';
import { Badge } from '../ui/Badge';

type ActualEntry = {
  position: number;
  code: string;
  displayName: string;
  team: string | null;
};

type PickEntry = {
  predictedPosition: number;
  actualPosition?: number;
  points: number;
  code: string;
  displayName: string;
};

type SessionResultsCardProps = {
  session: SessionType;
  actual: ActualEntry[];
  pickBreakdown?: PickEntry[];
  totalPoints?: number;
};

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

export function SessionResultsCard({
  session,
  actual,
  pickBreakdown,
  totalPoints,
}: SessionResultsCardProps) {
  // Sort breakdown by predicted position so it lines up with the actual list
  const breakdownByPredicted = pickBreakdown
    ? [...pickBreakdown].sort(
        (a, b) => a.predictedPosition - b.predictedPosition,
      )
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons color={colors.accent} name="trophy" size={16} />
          <Text style={styles.title}>{SESSION_LABELS[session]} Results</Text>
        </View>
        <Badge variant="finished">PUBLISHED</Badge>
      </View>

      {/* Two-column layout: actual | your picks */}
      <View style={styles.columnsLabel}>
        <Text style={styles.columnLabel}>ACTUAL TOP 5</Text>
        {breakdownByPredicted ? (
          <Text style={styles.columnLabel}>YOUR PICKS</Text>
        ) : null}
      </View>

      <View style={styles.columns}>
        <View style={styles.column}>
          {actual.map((entry) => (
            <DriverRow
              code={entry.code}
              key={`actual-${entry.position}`}
              name={entry.displayName}
              position={entry.position}
              team={entry.team}
            />
          ))}
        </View>
        {breakdownByPredicted ? (
          <View style={styles.column}>
            {breakdownByPredicted.map((pick) => (
              <PickRow
                key={`pick-${pick.predictedPosition}`}
                pick={pick}
              />
            ))}
          </View>
        ) : null}
      </View>

      {totalPoints != null ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>You scored</Text>
          <Text style={styles.totalValue}>{totalPoints} pts</Text>
        </View>
      ) : breakdownByPredicted ? null : (
        <Text style={styles.notSubmitted}>You didn’t submit picks.</Text>
      )}
    </View>
  );
}

function DriverRow({
  position,
  code,
  name,
  team,
}: {
  position: number;
  code: string;
  name: string;
  team: string | null;
}) {
  return (
    <View style={styles.driverRow}>
      <View
        style={[styles.teamStripe, { backgroundColor: getTeamColor(team) }]}
      />
      <Text style={styles.position}>P{position}</Text>
      <View style={styles.driverText}>
        <Text style={styles.driverCode}>{code}</Text>
        <Text numberOfLines={1} style={styles.driverName}>
          {name}
        </Text>
      </View>
    </View>
  );
}

function PickRow({ pick }: { pick: PickEntry }) {
  const fg = pointColor(pick.points);
  return (
    <View
      style={[
        styles.driverRow,
        styles.pickRow,
        {
          borderColor:
            pick.points >= 3
              ? fg
              : pick.points >= 1
                ? colors.warning
                : colors.border,
        },
      ]}
    >
      <Text style={styles.position}>P{pick.predictedPosition}</Text>
      <View style={styles.driverText}>
        <Text style={styles.driverCode}>{pick.code}</Text>
        <Text numberOfLines={1} style={styles.driverName}>
          {pick.displayName}
        </Text>
      </View>
      <View style={[styles.pointsPill, { borderColor: fg }]}>
        <Text style={[styles.pointsPillText, { color: fg }]}>
          +{pick.points}
        </Text>
      </View>
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
    padding: 12,
  },
  column: {
    flex: 1,
    gap: 6,
  },
  columnLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  columns: {
    flexDirection: 'row',
    gap: 8,
  },
  columnsLabel: {
    flexDirection: 'row',
    gap: 8,
  },
  driverCode: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  driverName: {
    color: colors.textMuted,
    fontSize: 10,
  },
  driverRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.35)',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
    paddingRight: 8,
    paddingVertical: 6,
  },
  driverText: {
    flex: 1,
    gap: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  notSubmitted: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  pickRow: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingLeft: 8,
  },
  pointsPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pointsPillText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  position: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    width: 22,
  },
  teamStripe: {
    height: '100%',
    width: 4,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  totalRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  totalValue: {
    color: colors.accent,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
});
