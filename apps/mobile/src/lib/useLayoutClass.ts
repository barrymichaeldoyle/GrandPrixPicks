import { useWindowDimensions } from 'react-native';

import { type LayoutClass, layoutClassForWidth } from './layout';

/**
 * The window's size class, live: it changes as a Stage Manager window is
 * resized, a Split View divider moves or an iPhone Duo is opened or closed.
 */
export function useLayoutClass(): LayoutClass {
  const { width } = useWindowDimensions();
  return layoutClassForWidth(width);
}
