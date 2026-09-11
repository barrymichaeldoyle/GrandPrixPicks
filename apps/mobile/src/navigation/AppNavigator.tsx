import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { analyticsEvents } from '@grandprixpicks/shared/analytics';
import { useRef } from 'react';

import { HeaderBackground } from '../components/ui/HeaderBackground';
import { useQuery } from '../integrations/convex/query';
import { api } from '../integrations/convex/api';
import { useMobileConfig } from '../providers/mobile-config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedEventDetailScreen } from '../screens/FeedEventDetailScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { RaceDetailScreen } from '../screens/RaceDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { flushPendingPushRoute } from '../lib/pushRouting';
import { captureAnalyticsEvent } from '../lib/analytics';
import { useIsSignedIn } from '../lib/useIsSignedIn';
import { colors } from '../theme/tokens';
import { PendingPickSubmitter } from '../components/PendingPickSubmitter';
import { linking } from './linking';
import { navigationRef } from './navigationRef';
import type {
  HomeStackParamList,
  LeaderboardStackParamList,
  MoreStackParamList,
  RootStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
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
  HomeTab: 'home',
  NotificationsTab: 'notifications',
  LeaderboardTab: 'trophy',
  MoreTab: 'ellipsis-horizontal',
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <HomeStack.Screen
        component={HomeTabScreen}
        name="HomeMain"
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        component={FeedEventDetailScreen}
        name="FeedEventDetail"
        options={{ title: 'Prediction' }}
      />
      <HomeStack.Screen
        component={PublicProfileScreen}
        name="PublicProfile"
        options={({ route }) => ({ title: `@${route.params.username}` })}
      />
      <HomeStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: 'Race Details' }}
      />
      <HomeStack.Screen
        component={NotificationsScreen}
        name="Notifications"
        options={{ title: 'Notifications' }}
      />
    </HomeStack.Navigator>
  );
}

function LeaderboardStackNavigator() {
  return (
    <LeaderboardStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <LeaderboardStack.Screen
        component={LeaderboardTabScreen}
        name="LeaderboardMain"
        options={{ headerShown: false }}
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
        component={MoreTabScreen}
        name="MoreMain"
        options={{ headerShown: false }}
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

function TabsNavigator() {
  const { convexEnabled } = useMobileConfig();
  const isSignedIn = useIsSignedIn();
  const unread = useQuery(
    api.inAppNotifications.getMyUnreadCount,
    convexEnabled && isSignedIn ? {} : 'skip',
  );
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: colors.page },
        tabBarActiveTintColor: colors.accent,
        tabBarIcon: ({ color, size }) => (
          <Ionicons color={color} name={TAB_ICONS[route.name]} size={size} />
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
        component={HomeStackNavigator}
        name="HomeTab"
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        component={NotificationsTabScreen}
        name="NotificationsTab"
        options={{
          title: 'Notifications',
          tabBarBadge: unread?.count ? unread.count : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.accent,
            color: colors.page,
          },
        }}
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
  );
}

export function AppNavigator() {
  const isSignedIn = useIsSignedIn();
  const previousRouteKeyRef = useRef<string | null>(null);

  function captureCurrentScreen() {
    const route = navigationRef.getCurrentRoute();
    if (route && route.key !== previousRouteKeyRef.current) {
      previousRouteKeyRef.current = route.key;
      captureAnalyticsEvent(analyticsEvents.screenViewed, {
        screen: route.name,
      });
    }
  }

  return (
    <NavigationContainer
      linking={linking}
      onReady={() => {
        flushPendingPushRoute();
        captureCurrentScreen();
      }}
      onStateChange={captureCurrentScreen}
      ref={navigationRef}
    >
      {/*
        No auth gate above the tabs. The calendar, the countdown and the
        leaderboard are public, and a visitor can build a card before they
        have an account. Sign-in is a sheet they reach from those screens —
        and it is omitted once they have a session, so a signed-in viewer
        cannot land on it via navigate, back-gesture, or a leftover modal.
      */}
      <PendingPickSubmitter />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen component={TabsNavigator} name="Tabs" />
        {isSignedIn ? null : (
          <RootStack.Screen
            component={SignInScreen}
            name="SignIn"
            options={{ presentation: 'modal' }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function TabPage({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: colors.page }}
    >
      {children}
    </SafeAreaView>
  );
}
function HomeTabScreen() {
  return (
    <TabPage>
      <FeedScreen />
    </TabPage>
  );
}
function LeaderboardTabScreen() {
  return (
    <TabPage>
      <LeaderboardScreen />
    </TabPage>
  );
}
function MoreTabScreen() {
  return (
    <TabPage>
      <MoreScreen />
    </TabPage>
  );
}
function NotificationsTabScreen() {
  return (
    <TabPage>
      <NotificationsScreen />
    </TabPage>
  );
}
