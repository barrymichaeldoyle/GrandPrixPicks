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
