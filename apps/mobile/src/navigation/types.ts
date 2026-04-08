export type HomeStackParamList = {
  HomeMain: undefined;
  RaceDetail: { raceSlug: string };
};

export type RacesStackParamList = {
  RaceCalendar: undefined;
  RaceDetail: { raceSlug: string };
};

export type PredictStackParamList = {
  PredictMain: undefined;
};

export type LeaguesStackParamList = {
  LeagueList: undefined;
  LeagueDetail: { leagueSlug: string };
  LeagueMembers: { leagueSlug: string };
  LeagueSettings: { leagueSlug: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PublicProfile: { username: string };
  PredictionHistory: { username: string };
  FollowerList: { username: string; tab: 'followers' | 'following' };
};

export type RootTabParamList = {
  HomeTab: undefined;
  RacesTab: undefined;
  PredictTab: undefined;
  LeaguesTab: undefined;
  ProfileTab: undefined;
};
