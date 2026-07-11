import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HeaderBackground } from '../components/ui/HeaderBackground';
import { NotificationBell } from '../components/ui/NotificationBell';
import { FeedEventDetailScreen } from '../screens/FeedEventDetailScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PicksConnectedScreen } from '../screens/PicksConnectedScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { RaceDetailScreen } from '../screens/RaceDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { flushPendingPushRoute } from '../lib/pushRouting';
import { colors } from '../theme/tokens';
import { useTypography } from '../theme/typography';
import { Text, View } from '../tw';
import { AuthGate } from './AuthGate';
import { linking } from './linking';
import { navigationRef } from './navigationRef';
import { SignInScreen } from '../screens/auth/SignInScreen';
import type {
  FeedStackParamList,
  LeaderboardStackParamList,
  MoreStackParamList,
  PicksStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const PicksStack = createNativeStackNavigator<PicksStackParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const LeaderboardStack =
  createNativeStackNavigator<LeaderboardStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

const SCREEN_OPTIONS = {
  contentStyle: { backgroundColor: colors.page },
  headerBackButtonDisplayMode: 'minimal' as const,
  headerBackground: () => <HeaderBackground />,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: 'transparent' },
  headerTintColor: colors.text,
};

const TAB_ICONS: Record<
  keyof RootTabParamList,
  React.ComponentProps<typeof Ionicons>['name']
> = {
  PicksTab: 'trophy',
  FeedTab: 'pulse',
  LeaderboardTab: 'podium',
  MoreTab: 'ellipsis-horizontal',
};

function BrandHeaderTitle() {
  const { titleFontFamily } = useTypography();
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-[26px] w-[26px] items-center justify-center rounded-full border border-accent-hover/35 bg-accent/10">
        <Ionicons color={colors.accent} name="flag" size={14} />
      </View>
      <Text
        className="text-foreground text-[17px] font-bold"
        style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}
      >
        Grand Prix Picks
      </Text>
    </View>
  );
}

function PicksStackNavigator() {
  return (
    <PicksStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <PicksStack.Screen
        component={PicksConnectedScreen}
        name="PicksMain"
        options={({ navigation }) => ({
          headerTitle: () => <BrandHeaderTitle />,
          headerRight: () => (
            <NotificationBell
              onPress={() =>
                navigation
                  .getParent()
                  ?.navigate('MoreTab', { screen: 'Notifications' })
              }
            />
          ),
        })}
      />
      <PicksStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: 'Race Details' }}
      />
    </PicksStack.Navigator>
  );
}

function FeedStackNavigator() {
  return (
    <FeedStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <FeedStack.Screen
        component={FeedScreen}
        name="FeedMain"
        options={({ navigation }) => ({
          headerTitle: () => <BrandHeaderTitle />,
          headerRight: () => (
            <NotificationBell
              onPress={() =>
                navigation
                  .getParent()
                  ?.navigate('MoreTab', { screen: 'Notifications' })
              }
            />
          ),
        })}
      />
      <FeedStack.Screen
        component={FeedEventDetailScreen}
        name="FeedEventDetail"
        options={{ title: 'Prediction' }}
      />
      <FeedStack.Screen
        component={PublicProfileScreen}
        name="PublicProfile"
        options={({ route }) => ({ title: `@${route.params.username}` })}
      />
      <FeedStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: 'Race Details' }}
      />
    </FeedStack.Navigator>
  );
}

function LeaderboardStackNavigator() {
  return (
    <LeaderboardStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <LeaderboardStack.Screen
        component={LeaderboardScreen}
        name="LeaderboardMain"
        options={{ headerTitle: () => <BrandHeaderTitle /> }}
      />
      <LeaderboardStack.Screen
        component={PublicProfileScreen}
        name="PublicProfile"
        options={({ route }) => ({ title: `@${route.params.username}` })}
      />
    </LeaderboardStack.Navigator>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <MoreStack.Screen
        component={MoreScreen}
        name="MoreMain"
        options={{ headerTitle: () => <BrandHeaderTitle /> }}
      />
      <MoreStack.Screen
        component={NotificationsScreen}
        name="Notifications"
        options={{ title: 'Notifications' }}
      />
      <MoreStack.Screen
        component={SettingsScreen}
        name="Settings"
        options={{ title: 'Settings' }}
      />
    </MoreStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer
      linking={linking}
      onReady={flushPendingPushRoute}
      ref={navigationRef}
    >
      <AuthGate fallback={<SignInScreen />}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            sceneStyle: { backgroundColor: colors.page },
            tabBarActiveTintColor: colors.accent,
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                color={color}
                name={TAB_ICONS[route.name]}
                size={size}
              />
            ),
            tabBarInactiveTintColor: colors.textMuted,
            tabBarItemStyle: {
              justifyContent: 'center',
              paddingBottom: 0,
              paddingTop: 0,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              marginBottom: 0,
            },
            tabBarBackground: () => <HeaderBackground />,
            tabBarStyle: {
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
              height: 76,
              paddingBottom: 6,
              paddingTop: 6,
            },
          })}
        >
          <Tab.Screen
            component={PicksStackNavigator}
            name="PicksTab"
            options={{ title: 'Picks' }}
          />
          <Tab.Screen
            component={FeedStackNavigator}
            name="FeedTab"
            options={{ title: 'Feed' }}
          />
          <Tab.Screen
            component={LeaderboardStackNavigator}
            name="LeaderboardTab"
            options={{ title: 'Leaderboard' }}
          />
          <Tab.Screen
            component={MoreStackNavigator}
            name="MoreTab"
            options={{ title: 'More' }}
          />
        </Tab.Navigator>
      </AuthGate>
    </NavigationContainer>
  );
}
