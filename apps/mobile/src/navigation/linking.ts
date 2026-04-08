import type { LinkingOptions } from '@react-navigation/native';

import type { RootTabParamList } from './types';

export const linking: LinkingOptions<RootTabParamList> = {
  config: {
    screens: {
      HomeTab: {
        path: 'home',
        screens: {
          HomeMain: '',
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
        },
      },
    },
  },
  prefixes: ['grandprixpicks://', 'https://grandprixpicks.com'],
};
