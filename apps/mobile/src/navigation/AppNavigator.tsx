import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HomeRouteScreen } from "../screens/HomeRouteScreen";
import { PicksConnectedScreen } from "../screens/PicksConnectedScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RaceDetailScreen } from "../screens/RaceDetailScreen";
import { linking } from "./linking";
import type {
  HomeStackParamList,
  PicksStackParamList,
  ProfileStackParamList,
  RootTabParamList,
} from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const PicksStack = createNativeStackNavigator<PicksStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: "#070b17" },
        headerStyle: { backgroundColor: "#0d1429" },
        headerTintColor: "#fff",
      }}
    >
      <HomeStack.Screen
        component={HomeRouteScreen}
        name="HomeMain"
        options={{ headerShown: false, title: "Home" }}
      />
      <HomeStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: "Race Details" }}
      />
    </HomeStack.Navigator>
  );
}

function PicksStackNavigator() {
  return (
    <PicksStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: "#070b17" },
        headerStyle: { backgroundColor: "#0d1429" },
        headerTintColor: "#fff",
      }}
    >
      <PicksStack.Screen
        component={PicksConnectedScreen}
        name="PicksMain"
        options={{ headerShown: false, title: "Picks" }}
      />
      <PicksStack.Screen
        component={RaceDetailScreen}
        name="RaceDetail"
        options={{ title: "Race Details" }}
      />
    </PicksStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: "#070b17" },
        headerStyle: { backgroundColor: "#0d1429" },
        headerTintColor: "#fff",
      }}
    >
      <ProfileStack.Screen
        component={ProfileScreen}
        name="ProfileMain"
        options={{ headerShown: false, title: "Profile" }}
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
          sceneStyle: { backgroundColor: "#070b17" },
          tabBarActiveTintColor: "#ffffff",
          tabBarIcon: ({ color, size }) => {
            const iconName =
              route.name === "HomeTab"
                ? "home"
                : route.name === "PicksTab"
                  ? "trophy"
                  : "person";
            return <Ionicons color={color} name={iconName} size={size} />;
          },
          tabBarInactiveTintColor: "#9fb0da",
          tabBarStyle: {
            backgroundColor: "#0d1429",
            borderTopColor: "#253761",
          },
        })}
      >
        <Tab.Screen
          component={HomeStackNavigator}
          name="HomeTab"
          options={{ title: "Home" }}
        />
        <Tab.Screen
          component={PicksStackNavigator}
          name="PicksTab"
          options={{ title: "Picks" }}
        />
        <Tab.Screen
          component={ProfileStackNavigator}
          name="ProfileTab"
          options={{ title: "Profile" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
