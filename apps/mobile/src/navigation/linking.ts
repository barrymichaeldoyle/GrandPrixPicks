import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  config: {
    screens: {
      SignIn: 'sign-in',
      Tabs: {
        screens: {
          NotificationsTab: 'notifications',
          HomeTab: {
            path: 'feed',
            screens: {
              HomeMain: { path: '', alias: [{ path: 'predict', exact: true }] },
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
    },
  },
  prefixes: ['grandprixpicks://', 'https://grandprixpicks.com'],
};
