import type { NavigatorScreenParams } from '@react-navigation/native';

export type PicksStackParamList = {
  PicksMain: undefined;
  RaceDetail: { raceSlug: string };
  Notifications: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  FeedEventDetail: { feedEventId: string };
  PublicProfile: { username: string };
  RaceDetail: { raceSlug: string };
  Notifications: undefined;
};

export type LeaderboardStackParamList = {
  LeaderboardMain: undefined;
  PublicProfile: { username: string };
};

export type MoreStackParamList = {
  MoreMain: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  PicksTab: NavigatorScreenParams<PicksStackParamList> | undefined;
  LeaderboardTab: NavigatorScreenParams<LeaderboardStackParamList> | undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};

/**
 * The root stack sits above the tabs and holds only the sign-in sheet.
 *
 * It lives here rather than inline in the navigator so any screen can ask for
 * sign-in without a cast. Every tab is reachable signed out now, so "send this
 * reader to sign-in" is a cross-cutting need, not a one-screen one.
 */
export type RootStackParamList = {
  Tabs: undefined;
  SignIn: undefined;
};
