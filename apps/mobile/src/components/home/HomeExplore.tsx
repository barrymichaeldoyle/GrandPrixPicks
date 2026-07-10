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
    body: 'Top 5 drivers for the next session. Every point counts.',
    tab: 'PicksTab',
  },
  {
    icon: 'podium-outline',
    title: 'Check the standings',
    body: 'Season and weekend leaderboards, Top 5 and H2H.',
    tab: 'LeaderboardTab',
  },
];

const HAIRLINE = StyleSheet.hairlineWidth;

export function HomeExplore() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const tabNav = navigation.getParent<NavigationProp<RootTabParamList>>();

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Explore</Text>
      <View>
        {ITEMS.map((item, i) => (
          <View key={item.tab}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={() => tabNav?.navigate(item.tab)}
              style={styles.row}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  color={colors.accentHover}
                  name={item.icon}
                  size={20}
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
              <Ionicons
                color={colors.textMuted}
                name="chevron-forward"
                size={16}
              />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  copy: {
    flex: 1,
  },
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginLeft: 48,
  },
  heading: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
    borderRadius: radii.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  section: {
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
