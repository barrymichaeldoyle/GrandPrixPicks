import type { LinkingOptions } from '@react-navigation/native';

import type { RootTabParamList } from './types';

export const linking: LinkingOptions<RootTabParamList> = {
  config: {
    screens: {
      PicksTab: {
        path: 'predict',
        screens: {
          PicksMain: '',
          RaceDetail: 'races/:raceSlug',
        },
      },
      HomeTab: {
        path: 'feed',
        screens: {
          HomeMain: '',
          FeedEventDetail: ':feedEventId',
          PublicProfile: 'p/:username',
        },
      },
      LeaderboardTab: {
        path: 'leaderboard',
        screens: {
          LeaderboardMain: '',
        },
      },
      MoreTab: {
        path: 'more',
        screens: {
          MoreMain: '',
          Notifications: 'notifications',
          Settings: 'settings',
        },
      },
    },
  },
  prefixes: ['grandprixpicks://', 'https://grandprixpicks.com'],
};
