import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  config: {
    screens: {
      SignIn: 'sign-in',
      Tabs: {
        screens: {
          HomeTab: {
            path: 'feed',
            screens: {
              HomeMain: { path: '', alias: [{ path: 'predict', exact: true }] },
              FeedEventDetail: ':feedEventId',
              PublicProfile: 'p/:username',
              RaceDetail: { path: 'races/:raceSlug', exact: true },
            },
          },
          LeaderboardTab: {
            path: 'leaderboard',
            screens: {
              LeaderboardMain: '',
            },
          },
          NotificationsTab: 'notifications',
          MoreTab: {
            path: 'more',
            // Keeps More under a deep-linked Races screen so it has a back
            // button. The nested config's types do not reach this far down.
            initialRouteName: 'MoreMain' as never,
            screens: {
              MoreMain: '',
              Settings: 'settings',
              Races: { path: 'races', exact: true },
            },
          },
        },
      },
    },
  },
  prefixes: ['grandprixpicks://', 'https://grandprixpicks.com'],
};
