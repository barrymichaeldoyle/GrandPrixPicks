import type { NavigatorScreenParams } from '@react-navigation/native';

export type PicksStackParamList = {
  PicksMain: undefined;
  RaceDetail: { raceSlug: string };
};

export type FeedStackParamList = {
  FeedMain: undefined;
  FeedEventDetail: { feedEventId: string };
  PublicProfile: { username: string };
  RaceDetail: { raceSlug: string };
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
  PicksTab: NavigatorScreenParams<PicksStackParamList> | undefined;
  FeedTab: NavigatorScreenParams<FeedStackParamList> | undefined;
  LeaderboardTab: NavigatorScreenParams<LeaderboardStackParamList> | undefined;
  MoreTab: NavigatorScreenParams<MoreStackParamList> | undefined;
};
