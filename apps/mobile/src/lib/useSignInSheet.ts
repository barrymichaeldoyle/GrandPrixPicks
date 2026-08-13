import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import type { RootStackParamList } from '../navigation/types';

/**
 * Opens the sign-in sheet from anywhere in the tabs.
 *
 * The sheet is on the root stack, one level above whichever tab stack a screen
 * belongs to. React Navigation resolves an unknown route name by walking up to
 * a parent that has it, so this works from any depth; typing it against the
 * root stack is what keeps that from needing a cast at each call site.
 */
export function useSignInSheet() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return function openSignIn() {
    navigation.navigate('SignIn');
  };
}
