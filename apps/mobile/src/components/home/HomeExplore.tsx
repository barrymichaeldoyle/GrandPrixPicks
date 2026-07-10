import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import type { RootTabParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

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

export function HomeExplore() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const tabNav = navigation.getParent<NavigationProp<RootTabParamList>>();

  return (
    <View className="gap-2">
      <Text className="text-muted text-[10px] font-extrabold uppercase">
        Explore
      </Text>
      <View>
        {ITEMS.map((item, i) => (
          <View key={item.tab}>
            {i > 0 ? <View className="ml-12 h-px bg-border" /> : null}
            <Pressable
              className="flex-row items-center gap-3 py-3 active:opacity-70"
              onPress={() => tabNav?.navigate(item.tab)}
            >
              <View className="h-9 w-9 items-center justify-center rounded-md bg-accent/15">
                <Ionicons
                  color={colors.accentHover}
                  name={item.icon}
                  size={20}
                />
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-sm font-bold">
                  {item.title}
                </Text>
                <Text className="text-muted mt-0.5 text-xs leading-4">
                  {item.body}
                </Text>
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
