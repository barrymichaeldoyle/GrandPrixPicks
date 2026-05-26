import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatRaceDate } from '../../lib/dates';
import { getLockStatusViewModel } from '../../lib/lockTime';
import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { useNow } from '../../lib/useNow';
import type { RaceWeekend } from '../../types';
import { colors, radii } from '../../theme/tokens';
import { Badge } from '../ui/Badge';
import { Numeral } from '../ui/Numeral';
import { PredictionCountdownBadge } from '../ui/PredictionCountdownBadge';

const HEADER_HEIGHT = 58;
const FLAG_WIDTH = 78;
const BORDER_WIDTH = 3;

type RaceCardProps = {
  race: RaceWeekend;
  /** True when this race is the next predictable race. Highlights with accent border + glow. */
  isNext?: boolean;
  /** Optional explicit round number; falls back to "—". */
  round?: number;
  onPress: () => void;
};

function getFirstOpenSession(race: RaceWeekend, now: number) {
  for (const session of race.sessions) {
    const startsAt = new Date(session.startsAt).getTime();
    if (startsAt > now) {
      return { type: session.type, startsAt };
    }
  }
  return null;
}

function isWeekendFullyPast(race: RaceWeekend, now: number) {
  return race.sessions.every((s) => new Date(s.startsAt).getTime() <= now);
}

export function RaceCard({ race, isNext, round, onPress }: RaceCardProps) {
  const now = useNow();
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const firstOpen = getFirstOpenSession(race, now);
  const isFullyPast = isWeekendFullyPast(race, now);
  const showFinishedBadge = isFullyPast;

  const lockStatus = firstOpen
    ? getLockStatusViewModel(firstOpen.startsAt - now, now)
    : null;
  const showLockBadge =
    isNext && lockStatus && lockStatus.urgency !== 'open' && !lockStatus.isLocked;

  return (
    <View style={isNext ? styles.cardGlow : null}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        style={[
          styles.card,
          {
            backgroundColor: isNext
              ? 'rgba(20, 184, 166, 0.08)'
              : colors.surface,
            borderColor: isNext ? colors.accentHover : colors.border,
            opacity: isFullyPast ? 0.55 : 1,
          },
        ]}
      >
      {/* Header: flag + round + name + chevron */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isNext ? colors.accent : colors.border },
        ]}
      >
        {countryCode ? (
          <View
            style={[
              styles.flagFrame,
              { borderRightColor: isNext ? colors.accent : colors.border },
            ]}
          >
            <Image
              source={{ uri: `https://flagcdn.com/w160/${countryCode}.png` }}
              style={styles.flag}
            />
          </View>
        ) : null}
        <View style={styles.headerText}>
          {round != null ? (
            <View style={styles.roundRow}>
              <Text style={styles.round}>ROUND</Text>
              <Numeral tone="muted" variant="small">
                {round}
              </Numeral>
            </View>
          ) : (
            <Text style={styles.round}>{race.country.toUpperCase()}</Text>
          )}
          <Text numberOfLines={2} style={styles.name}>
            {race.name}
          </Text>
        </View>
        <Ionicons
          color={isNext ? colors.accentHover : colors.accent}
          name="chevron-forward"
          size={18}
          style={styles.chevron}
        />
      </View>

      {/* Body: status badges + session schedule */}
      <View style={styles.body}>
        <View style={styles.badgeRow}>
          {showFinishedBadge ? <Badge variant="finished" /> : null}
          {race.hasSprint ? <Badge variant="sprint">SPRINT</Badge> : null}
          {isNext && firstOpen ? (
            <PredictionCountdownBadge
              labelMode="lock"
              predictionLockAt={firstOpen.startsAt}
            />
          ) : null}
          {showLockBadge && lockStatus ? (
            <Badge variant="warning">{lockStatus.label}</Badge>
          ) : null}
        </View>

        {race.sessions.length > 0 ? (
          <View style={styles.schedulePanel}>
            <View style={styles.scheduleHeader}>
              <View style={styles.scheduleHeaderLeft}>
                <Ionicons
                  color={colors.textMuted}
                  name="calendar-outline"
                  size={11}
                />
                <Text style={styles.scheduleHeaderText}>WEEKEND SESSIONS</Text>
              </View>
            </View>
            {race.sessions.map((session) => {
              const isRaceSession = session.type === 'race';
              const formatted = formatRaceDate(session.startsAt, race.slug);
              return (
                <View key={session.type} style={styles.scheduleRow}>
                  <Text
                    style={[
                      styles.scheduleLabel,
                      isRaceSession ? styles.scheduleLabelStrong : null,
                    ]}
                  >
                    {SESSION_LABELS[session.type]}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTime,
                      isRaceSession ? styles.scheduleTimeStrong : null,
                    ]}
                  >
                    {formatted.local}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  body: {
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: BORDER_WIDTH,
    overflow: 'hidden',
  },
  cardGlow: {
    borderRadius: radii.xl,
    elevation: 10,
    shadowColor: colors.accent,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },
  chevron: {
    paddingHorizontal: 10,
  },
  flag: {
    height: '100%',
    width: '100%',
  },
  flagFrame: {
    borderRightWidth: BORDER_WIDTH,
    height: HEADER_HEIGHT,
    overflow: 'hidden',
    width: FLAG_WIDTH,
  },
  header: {
    alignItems: 'stretch',
    borderBottomWidth: BORDER_WIDTH,
    flexDirection: 'row',
    height: HEADER_HEIGHT,
  },
  headerText: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
  },
  round: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  roundRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scheduleHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  scheduleHeaderText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scheduleLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  scheduleLabelStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  schedulePanel: {
    backgroundColor: 'rgba(51, 65, 85, 0.35)',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scheduleTime: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  scheduleTimeStrong: {
    color: colors.text,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
