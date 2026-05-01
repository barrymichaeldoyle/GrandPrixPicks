import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';

import { HomeRouteScreen } from '../screens/HomeRouteScreen';
import { PicksConnectedScreen } from '../screens/PicksConnectedScreen';
import { FollowListScreen } from '../screens/FollowListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { RaceDetailScreen } from '../screens/RaceDetailScreen';
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
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
};

function BrandHeaderTitle() {
  const { titleFontFamily } = useTypography();
  return (
    <Text
      style={[
        styles.brandTitle,
        titleFontFamily ? { fontFamily: titleFontFamily } : null,
      ]}
    >
      GrandPrixPicks
    </Text>
  );
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={SCREEN_OPTIONS}>
      <HomeStack.Screen
        component={HomeRouteScreen}
        name="HomeMain"
        options={{ headerTitle: () => <BrandHeaderTitle /> }}
      />
      <HomeStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: 'Race Details' }}
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
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
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
  brandTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
