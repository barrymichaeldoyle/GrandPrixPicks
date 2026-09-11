import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  HomeMain: undefined;
  FeedEventDetail: { feedEventId: string };
  PublicProfile: { username: string };
  RaceDetail: { raceSlug: string };
  Notifications: undefined;
};

export type LeaderboardStackParamList = {
  LeaderboardMain: { raceId?: string; time?: 'weekend' | 'season' } | undefined;
  PublicProfile: { username: string };
};

export type MoreStackParamList = {
  MoreMain: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  LeaderboardTab: NavigatorScreenParams<LeaderboardStackParamList> | undefined;
  NotificationsTab: undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};

/**
 * The root stack sits above the tabs and holds only the sign-in sheet.
 *
 * It lives here rather than inline in the navigator so any screen can ask for
 * sign-in without a cast. Every tab is reachable signed out now, so "send this
 * reader to sign-in" is a cross-cutting need, not a one-screen one. The sheet
 * is unregistered while signed in; the param remains so callers type-check.
 */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  SignIn: undefined;
};
