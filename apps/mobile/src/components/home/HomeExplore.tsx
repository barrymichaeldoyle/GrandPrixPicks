import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootTabParamList } from '../../navigation/types';
import { colors, radii } from '../../theme/tokens';

type ExploreItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  tab: keyof RootTabParamList;
};

const ITEMS: ReadonlyArray<ExploreItem> = [
  {
    icon: 'trophy-outline',
    title: 'Make your picks',
    body: 'Top 5 drivers for the next session — every point counts.',
    tab: 'PredictTab',
  },
  {
    icon: 'calendar-outline',
    title: 'Browse the calendar',
    body: 'Every race and session, locked-in times, sprint weekends.',
    tab: 'RacesTab',
  },
  {
    icon: 'people-outline',
    title: 'Join a league',
    body: 'Compete against your friends across the season.',
    tab: 'LeaguesTab',
  },
];

export function HomeExplore() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const tabNav = navigation.getParent<NavigationProp<RootTabParamList>>();

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Explore</Text>
      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.tab}
            onPress={() => tabNav?.navigate(item.tab)}
            style={({ pressed }) => [
              styles.card,
              pressed ? styles.cardPressed : null,
            ]}
          >
            <View style={styles.iconWrap}>
              <Ionicons color={colors.accentHover} name={item.icon} size={22} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
            <Ionicons
              color={colors.textMuted}
              name="chevron-forward"
              size={18}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  heading: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
    borderRadius: radii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  list: {
    gap: 10,
  },
  section: {
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
