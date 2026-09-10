import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import type { RootStackParamList } from '../navigation/types';
import { useIsSignedIn } from './useIsSignedIn';

/**
 * Opens the sign-in sheet from anywhere in the tabs.
 *
 * The sheet is on the root stack, one level above whichever tab stack a screen
 * belongs to. React Navigation resolves an unknown route name by walking up to
 * a parent that has it, so this works from any depth; typing it against the
 * root stack is what keeps that from needing a cast at each call site.
 *
 * A signed-in viewer never gets the sheet: the route is also omitted from the
 * root stack, so a stray navigate would miss. This guard is the first line.
 */
export function useSignInSheet() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isSignedIn = useIsSignedIn();

  return function openSignIn() {
    if (isSignedIn) {
      return;
    }
    navigation.navigate('SignIn');
  };
}
