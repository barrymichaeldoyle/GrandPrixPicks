import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import { StyleSheet, Text, View } from 'react-native';

import { getTeamColor } from '../../lib/teamColors';
import { colors, radii } from '../../theme/tokens';

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
    return colors.accentHover;
  }
  if (points >= 1) {
    return colors.warning;
  }
  return colors.textMuted;
}

const HAIRLINE = StyleSheet.hairlineWidth;

export function SessionResultsCard({
  session,
  actual,
  pickBreakdown,
  totalPoints,
}: SessionResultsCardProps) {
  const breakdownByPredicted = pickBreakdown
    ? [...pickBreakdown].sort(
        (a, b) => a.predictedPosition - b.predictedPosition,
      )
    : null;

  return (
    <View style={styles.block}>
      <View style={styles.subhead}>
        <Text style={styles.sessionLabel}>{SESSION_LABELS[session]}</Text>
        {totalPoints != null ? (
          <Text style={styles.totalInline}>
            <Text style={styles.totalLabel}>You scored </Text>
            <Text style={styles.totalValue}>{totalPoints} pts</Text>
          </Text>
        ) : breakdownByPredicted ? null : (
          <Text style={styles.notSubmitted}>No picks submitted</Text>
        )}
      </View>

      <View style={styles.columnsLabel}>
        <Text style={styles.columnLabel}>Actual top 5</Text>
        {breakdownByPredicted ? (
          <Text style={styles.columnLabel}>Your picks</Text>
        ) : null}
      </View>

      <View style={styles.columns}>
        <View style={styles.column}>
          {actual.map((entry, i) => (
            <View key={`actual-${entry.position}`}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <DriverRow
                code={entry.code}
                name={entry.displayName}
                position={entry.position}
                team={entry.team}
              />
            </View>
          ))}
        </View>
        {breakdownByPredicted ? (
          <View style={styles.column}>
            {breakdownByPredicted.map((pick, i) => (
              <View key={`pick-${pick.predictedPosition}`}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <PickRow pick={pick} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
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
    <View style={styles.row}>
      <View style={[styles.stripe, { backgroundColor: getTeamColor(team) }]} />
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
    <View style={styles.row}>
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
  block: {
    gap: 8,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
  },
  columnsLabel: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4,
  },
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginLeft: 6,
  },
  driverCode: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  driverName: {
    color: colors.textMuted,
    fontSize: 10,
  },
  driverText: {
    flex: 1,
    gap: 1,
  },
  notSubmitted: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  sessionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  stripe: {
    alignSelf: 'stretch',
    borderRadius: 1.5,
    width: 3,
  },
  subhead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalInline: {
    fontSize: 12,
  },
  totalLabel: {
    color: colors.textMuted,
  },
  totalValue: {
    color: colors.accentHover,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
});
