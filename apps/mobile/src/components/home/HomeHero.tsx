import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import type { RaceWeekend } from '../../types';
import type { HomeStackParamList } from '../../navigation/types';
import { BigCountdown } from '../ui/BigCountdown';
import { Numeral } from '../ui/Numeral';

const NARROW_WIDTH = 360;

type NextSession = {
  type: string;
  label: string;
  startAt: number;
};

const SESSION_LABEL: Record<string, string> = {
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};

function getFeatured(
  races: ReadonlyArray<RaceWeekend>,
  now: number,
): {
  race: RaceWeekend;
  round: number;
  nextSession: NextSession | null;
} | null {
  const sorted = races
    .slice()
    .sort(
      (a, b) =>
        new Date(a.weekendStart).getTime() - new Date(b.weekendStart).getTime(),
    );
  const upcomingIndex = sorted.findIndex(
    (r) =>
      r.sessions.length === 0 ||
      new Date(r.sessions[r.sessions.length - 1].startsAt).getTime() > now,
  );
  if (upcomingIndex === -1) {
    return null;
  }
  const race = sorted[upcomingIndex];
  const round = upcomingIndex + 1;
  let nextSession: NextSession | null = null;
  for (const session of race.sessions) {
    const startAt = new Date(session.startsAt).getTime();
    if (startAt > now) {
      nextSession = {
        type: session.type,
        label: SESSION_LABEL[session.type] ?? session.type,
        startAt,
      };
      break;
    }
  }
  return { race, round, nextSession };
}

export function HomeHero() {
  const { titleFontFamily } = useTypography();
  const { races } = useRaceWeekends();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { width } = useWindowDimensions();
  const isNarrow = width < NARROW_WIDTH;

  const featured = getFeatured(races, Date.now());
  if (!featured) {
    return null;
  }
  const { race, round, nextSession } = featured;
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const totalRounds = races.length;

  return (
    <View style={[styles.content, isNarrow ? styles.contentNarrow : null]}>
      <View style={styles.identity}>
        {countryCode ? (
          <View style={styles.flagBadge}>
            <Image
              source={{
                uri: `https://flagcdn.com/w160/${countryCode}.png`,
              }}
              style={styles.flagImage}
            />
          </View>
        ) : null}
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={2}
          style={[
            styles.raceName,
            isNarrow ? styles.raceNameNarrow : null,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          {race.name}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>ROUND</Text>
        <Numeral style={styles.metaNumeral} tone="muted" variant="small">
          {round}
        </Numeral>
        {totalRounds > 0 ? (
          <Text style={styles.metaLabel}>{` / ${totalRounds}`}</Text>
        ) : null}
        {race.hasSprint ? (
          <>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.metaAccent}>SPRINT WEEKEND</Text>
          </>
        ) : null}
      </View>

      {nextSession ? (
        <>
          <View style={styles.countdownWrapper}>
            <BigCountdown targetAt={nextSession.startAt} />
          </View>
          <Text style={styles.countdownCopy}>
            until{' '}
            <Text style={styles.countdownTarget}>{nextSession.label}</Text>
          </Text>
        </>
      ) : (
        <Text style={styles.weekendOver}>Weekend complete</Text>
      )}

      <Pressable
        onPress={() =>
          navigation.navigate('RaceDetail', { raceSlug: race.slug })
        }
        style={({ pressed }) => [
          styles.cta,
          pressed ? styles.ctaPressed : null,
        ]}
      >
        <Text style={styles.ctaText}>Make predictions</Text>
        <Ionicons color={colors.accentHover} name="arrow-forward" size={14} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  contentNarrow: {
    gap: 12,
    marginBottom: 20,
  },
  countdownCopy: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  countdownTarget: {
    color: colors.text,
    fontWeight: '700',
  },
  countdownWrapper: {
    alignSelf: 'stretch',
    marginTop: 2,
  },
  cta: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.buttonAccent,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  ctaPressed: {
    backgroundColor: colors.buttonAccentHover,
  },
  ctaText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  flagBadge: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.md,
    borderWidth: 1,
    height: 30,
    overflow: 'hidden',
    width: 44,
  },
  flagImage: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'column',
    gap: 10,
    justifyContent: 'center',
  },
  metaAccent: {
    color: colors.accentHover,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  metaDivider: {
    color: colors.borderStrong,
    fontSize: 10,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  metaNumeral: {
    color: colors.textMuted,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
  },
  raceName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  raceNameNarrow: {
    fontSize: 21,
  },
  weekendOver: {
    color: colors.accentHover,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
