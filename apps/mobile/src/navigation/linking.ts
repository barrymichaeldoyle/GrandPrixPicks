import type { LinkingOptions } from '@react-navigation/native';

import type { RootTabParamList } from './types';

export const linking: LinkingOptions<RootTabParamList> = {
  config: {
    screens: {
      HomeTab: {
        path: 'home',
        screens: {
          HomeMain: '',
          Notifications: 'notifications',
          FeedEventDetail: 'feed/:feedEventId',
        },
      },
      RacesTab: {
        path: 'races',
        screens: {
          RaceCalendar: '',
          RaceDetail: ':raceSlug',
        },
      },
      PredictTab: {
        path: 'predict',
        screens: {
          PredictMain: '',
        },
      },
      LeaguesTab: {
        path: 'leagues',
        screens: {
          LeagueList: '',
          LeagueDetail: ':leagueSlug',
        },
      },
      ProfileTab: {
        path: 'profile',
        screens: {
          ProfileMain: '',
          PublicProfile: 'p/:username',
          PredictionHistory: 'p/:username/picks',
          Leaderboard: 'leaderboard',
          Settings: 'settings',
        },
      },
    },
  },
  prefixes: ['grandprixpicks://', 'https://grandprixpicks.com'],
};
