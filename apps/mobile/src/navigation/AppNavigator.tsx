import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';

import { HomeRouteScreen } from '../screens/HomeRouteScreen';
import { PicksConnectedScreen } from '../screens/PicksConnectedScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RaceDetailScreen } from '../screens/RaceDetailScreen';
import { colors } from '../theme/tokens';
import { useTypography } from '../theme/typography';
import { linking } from './linking';
import type {
  HomeStackParamList,
  PicksStackParamList,
  ProfileStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const PicksStack = createNativeStackNavigator<PicksStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

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
    <HomeStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.page },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <HomeStack.Screen
        component={HomeRouteScreen}
        name="HomeMain"
        options={{
          headerShown: true,
          headerTitle: () => <BrandHeaderTitle />,
        }}
      />
      <HomeStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: 'Race Details' }}
      />
    </HomeStack.Navigator>
  );
}

function PicksStackNavigator() {
  return (
    <PicksStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.page },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <PicksStack.Screen
        component={PicksConnectedScreen}
        name="PicksMain"
        options={{
          headerShown: true,
          headerTitle: () => <BrandHeaderTitle />,
        }}
      />
      <PicksStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: 'Race Details' }}
      />
    </PicksStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.page },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <ProfileStack.Screen
        component={ProfileScreen}
        name="ProfileMain"
        options={{
          headerShown: true,
          headerTitle: () => <BrandHeaderTitle />,
        }}
      />
    </ProfileStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneStyle: { backgroundColor: colors.page },
          tabBarActiveTintColor: colors.accent,
          tabBarIcon: ({ color, size }) => {
            const iconName =
              route.name === 'HomeTab'
                ? 'home'
                : route.name === 'PicksTab'
                  ? 'trophy'
                  : 'person';
            return <Ionicons color={color} name={iconName} size={size} />;
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
          component={PicksStackNavigator}
          name="PicksTab"
          options={{ title: 'Picks' }}
        />
        <Tab.Screen
          component={ProfileStackNavigator}
          name="ProfileTab"
          options={{ title: 'Profile' }}
        />
      </Tab.Navigator>
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
