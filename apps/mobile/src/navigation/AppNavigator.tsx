import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { HeaderBackground } from '../components/ui/HeaderBackground';
import { NotificationBell } from '../components/ui/NotificationBell';
import { FeedEventDetailScreen } from '../screens/FeedEventDetailScreen';
import { HomeRouteScreen } from '../screens/HomeRouteScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PicksConnectedScreen } from '../screens/PicksConnectedScreen';
import { FollowListScreen } from '../screens/FollowListScreen';
import { PredictionHistoryScreen } from '../screens/PredictionHistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { RaceDetailScreen } from '../screens/RaceDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LeagueDetailScreen } from '../screens/leagues/LeagueDetailScreen';
import { LeagueListScreen } from '../screens/leagues/LeagueListScreen';
import { LeagueSettingsScreen } from '../screens/leagues/LeagueSettingsScreen';
import { RaceCalendarScreen } from '../screens/races/RaceCalendarScreen';
import { colors } from '../theme/tokens';
import { useTypography } from '../theme/typography';
import { AuthGate } from './AuthGate';
import { linking } from './linking';
import { SignInScreen } from '../screens/auth/SignInScreen';
import type {
  HomeStackParamList,
  LeaguesStackParamList,
  PredictStackParamList,
  ProfileStackParamList,
  RacesStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const RacesStack = createNativeStackNavigator<RacesStackParamList>();
const PredictStack = createNativeStackNavigator<PredictStackParamList>();
const LeaguesStack = createNativeStackNavigator<LeaguesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const SCREEN_OPTIONS = {
  contentStyle: { backgroundColor: colors.page },
  headerBackButtonDisplayMode: 'minimal' as const,
  headerBackground: () => <HeaderBackground />,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: 'transparent' },
  headerTintColor: colors.text,
};

function BrandHeaderTitle() {
  const { titleFontFamily } = useTypography();
  return (
    <View style={styles.brand}>
      <View style={styles.brandBadge}>
        <Ionicons color={colors.accent} name="flag" size={14} />
      </View>
      <Text
        style={[
          styles.brandTitle,
          titleFontFamily ? { fontFamily: titleFontFamily } : null,
        ]}
      >
        Grand Prix Picks
      </Text>
    </View>
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <HomeStack.Screen
        component={HomeRouteScreen}
        name="HomeMain"
        options={({ navigation }) => ({
          headerTitle: () => <BrandHeaderTitle />,
          headerRight: () => (
            <NotificationBell
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
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
      <HomeStack.Screen
        component={FeedEventDetailScreen}
        name="FeedEventDetail"
        options={{ title: 'Prediction' }}
      />
    </HomeStack.Navigator>
  );
}

function RacesStackNavigator() {
  return (
    <RacesStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <RacesStack.Screen
        component={RaceCalendarScreen}
        name="RaceCalendar"
        options={{ headerTitle: () => <BrandHeaderTitle /> }}
      />
      <RacesStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={({ route }) => ({
          title: route.params.raceSlug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .replace(/-\d{4}$/, ''),
        })}
      />
    </RacesStack.Navigator>
  );
}

function PredictStackNavigator() {
  return (
    <PredictStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <PredictStack.Screen
        component={PicksConnectedScreen}
        name="PredictMain"
        options={{ headerTitle: () => <BrandHeaderTitle /> }}
      />
    </PredictStack.Navigator>
  );
}

function LeaguesStackNavigator() {
  return (
    <LeaguesStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <LeaguesStack.Screen
        component={LeagueListScreen}
        name="LeagueList"
        options={{ headerTitle: () => <BrandHeaderTitle /> }}
      />
      <LeaguesStack.Screen
        component={LeagueDetailScreen}
        name="LeagueDetail"
        options={({ route }) => ({ title: route.params.leagueSlug })}
      />
      <LeaguesStack.Screen
        component={LeagueSettingsScreen}
        name="LeagueSettings"
        options={{ title: 'League settings' }}
      />
    </LeaguesStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <ProfileStack.Screen
        component={ProfileScreen}
        name="ProfileMain"
        options={{ headerTitle: () => <BrandHeaderTitle /> }}
      />
      <ProfileStack.Screen
        component={PublicProfileScreen}
        name="PublicProfile"
        options={({ route }) => ({ title: `@${route.params.username}` })}
      />
      <ProfileStack.Screen
        component={FollowListScreen}
        name="FollowerList"
        options={({ route }) => ({ title: `@${route.params.username}` })}
      />
      <ProfileStack.Screen
        component={PredictionHistoryScreen}
        name="PredictionHistory"
        options={{ title: 'Picks history' }}
      />
      <ProfileStack.Screen
        component={LeaderboardScreen}
        name="Leaderboard"
        options={{ title: 'Leaderboard' }}
      />
      <ProfileStack.Screen
        component={SettingsScreen}
        name="Settings"
        options={{ title: 'Settings' }}
      />
    </ProfileStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <AuthGate fallback={<SignInScreen />}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            sceneStyle: { backgroundColor: colors.page },
            tabBarActiveTintColor: colors.accent,
            tabBarIcon: ({ color, size }) => {
              const iconName =
                route.name === 'HomeTab'
                  ? 'home'
                  : route.name === 'RacesTab'
                    ? 'calendar'
                    : route.name === 'PredictTab'
                      ? 'trophy'
                      : route.name === 'LeaguesTab'
                        ? 'people'
                        : 'person';
              return (
                <Ionicons
                  color={color}
                  name={
                    iconName as
                      | 'home'
                      | 'calendar'
                      | 'trophy'
                      | 'people'
                      | 'person'
                  }
                  size={size}
                />
              );
            },
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
            component={RacesStackNavigator}
            name="RacesTab"
            options={{ title: 'Races' }}
          />
          <Tab.Screen
            component={PredictStackNavigator}
            name="PredictTab"
            options={{ title: 'Predict' }}
          />
          <Tab.Screen
            component={LeaguesStackNavigator}
            name="LeaguesTab"
            options={{ title: 'Leagues' }}
          />
          <Tab.Screen
            component={ProfileStackNavigator}
            name="ProfileTab"
            options={{ title: 'Profile' }}
          />
        </Tab.Navigator>
      </AuthGate>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  brandBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(45, 212, 191, 0.35)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
