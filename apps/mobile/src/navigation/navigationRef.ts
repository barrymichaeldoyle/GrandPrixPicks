import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();
