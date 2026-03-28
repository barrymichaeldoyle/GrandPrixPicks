import type { LinkingOptions } from '@react-navigation/native';

import type { RootTabParamList } from './types';

export const linking: LinkingOptions<RootTabParamList> = {
  config: {
    screens: {
      HomeTab: {
        path: 'home',
        screens: {
          HomeMain: '',
          RaceDetail: 'races/:raceSlug',
        },
      },
      PicksTab: {
        path: 'picks',
        screens: {
          PicksMain: '',
          RaceDetail: 'races/:raceSlug',
        },
      },
      ProfileTab: {
        path: 'profile',
        screens: {
          ProfileMain: '',
        },
      },
    },
  },
  prefixes: ['grandprixpicks://', 'https://grandprixpicks.com'],
};
