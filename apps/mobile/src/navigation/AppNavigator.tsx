import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HeaderBackground } from '../components/ui/HeaderBackground';
import { NotificationBell } from '../components/ui/NotificationBell';
import { BrandMark } from '../components/ui/BrandMark';
import { FeedEventDetailScreen } from '../screens/FeedEventDetailScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PicksConnectedScreen } from '../screens/PicksConnectedScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { RaceDetailScreen } from '../screens/RaceDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { flushPendingPushRoute } from '../lib/pushRouting';
import { useIsSignedIn } from '../lib/useIsSignedIn';
import { colors } from '../theme/tokens';
import { useTypography } from '../theme/typography';
import { Text, View } from '../tw';
import { PendingPickSubmitter } from '../components/PendingPickSubmitter';
import { linking } from './linking';
import { navigationRef } from './navigationRef';
import type {
  HomeStackParamList,
  LeaderboardStackParamList,
  MoreStackParamList,
  PicksStackParamList,
  RootStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const PicksStack = createNativeStackNavigator<PicksStackParamList>();
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
  PicksTab: 'flag',
  LeaderboardTab: 'trophy',
  MoreTab: 'ellipsis-horizontal',
};

function BrandHeaderTitle() {
  const { titleFontFamily } = useTypography();
  return (
    <View className="flex-row items-center gap-2">
      {/* The mark, not a generic flag glyph in a tinted chip. That chip was
          the old identity's motif and survived the reskin by being recoloured
          rather than replaced. */}
      <BrandMark size={24} />
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
  const isSignedIn = useIsSignedIn();

  return (
    <PicksStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <PicksStack.Screen
        component={PicksConnectedScreen}
        name="PicksMain"
        options={({ navigation }) => ({
          headerTitle: () => <BrandHeaderTitle />,
          headerRight: isSignedIn
            ? () => (
                <NotificationBell
                  onPress={() => navigation.navigate('Notifications')}
                />
              )
            : undefined,
        })}
      />
      <PicksStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: 'Race Details' }}
      />
      <PicksStack.Screen
        component={NotificationsScreen}
        name="Notifications"
        options={{ title: 'Notifications' }}
      />
    </PicksStack.Navigator>
  );
}

function HomeStackNavigator() {
  const isSignedIn = useIsSignedIn();

  return (
    <HomeStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <HomeStack.Screen
        component={FeedScreen}
        name="HomeMain"
        options={({ navigation }) => ({
          headerTitle: () => <BrandHeaderTitle />,
          headerRight: isSignedIn
            ? () => (
                <NotificationBell
                  onPress={() => navigation.navigate('Notifications')}
                />
              )
            : undefined,
        })}
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

function TabsNavigator() {
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
        component={PicksStackNavigator}
        name="PicksTab"
        options={{ title: 'Picks' }}
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
  return (
    <NavigationContainer
      linking={linking}
      onReady={flushPendingPushRoute}
      ref={navigationRef}
    >
      {/*
        No auth gate above the tabs any more. The calendar, the countdown and
        the leaderboard are all public data, and a visitor can build a card
        before they have an account: the screens that genuinely need an
        identity ask for it themselves, and sign-in is a sheet they can reach
        from wherever they hit that point.
      */}
      <PendingPickSubmitter />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen component={TabsNavigator} name="Tabs" />
        <RootStack.Screen
          component={SignInScreen}
          name="SignIn"
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
