import type React from 'react';
import {
  ActivityIndicator as RNActivityIndicator,
  FlatList as RNFlatList,
  Image as RNImage,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Modal as RNModal,
  Pressable as RNPressable,
  RefreshControl as RNRefreshControl,
  SafeAreaView as RNSafeAreaView,
  ScrollView as RNScrollView,
  SectionList as RNSectionList,
  Switch as RNSwitch,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableOpacity as RNTouchableOpacity,
  View as RNView,
} from 'react-native';
import { useCssElement, useNativeVariable } from 'react-native-css';
import Animated from 'react-native-reanimated';

type ClassNameProps = { className?: string };

function cssElement<TProps extends object>(
  Component: React.ComponentType<TProps>,
  mapping: Record<string, string> = { className: 'style' },
) {
  function CssElement(props: TProps & ClassNameProps) {
    return useCssElement(Component, props, mapping as never);
  }
  CssElement.displayName = `CSS(${Component.displayName ?? Component.name ?? 'Component'})`;
  return CssElement;
}

export const ActivityIndicator = cssElement(RNActivityIndicator);
export const Image = cssElement(RNImage);
export const KeyboardAvoidingView = cssElement(RNKeyboardAvoidingView);
export const Modal = cssElement(RNModal);
export const Pressable = cssElement(RNPressable);
export const RefreshControl = cssElement(RNRefreshControl);
export const SafeAreaView = cssElement(RNSafeAreaView);
export const Switch = cssElement(RNSwitch);
export const Text = cssElement(RNText);
// React 19 forwards `ref` as a regular prop through the wrapper, but
// TextInputProps doesn't declare it — widen the type so focus chaining works.
export const TextInput = cssElement(RNTextInput) as React.ComponentType<
  React.ComponentProps<typeof RNTextInput> &
    ClassNameProps & { ref?: React.Ref<RNTextInput> }
>;
export const TouchableOpacity = cssElement(RNTouchableOpacity);
export const View = cssElement(RNView);
export const AnimatedView = Animated.createAnimatedComponent(View);

export function ScrollView(
  props: React.ComponentProps<typeof RNScrollView> &
    ClassNameProps & { contentContainerClassName?: string },
) {
  const renderCssElement = useCssElement as (
    component: React.ComponentType<React.ComponentProps<typeof RNScrollView>>,
    elementProps: typeof props,
    configuration: Record<string, string>,
  ) => React.ReactElement;
  return renderCssElement(RNScrollView, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
}
export function FlatList<ItemT>(
  props: React.ComponentProps<typeof RNFlatList<ItemT>> &
    ClassNameProps & {
      contentContainerClassName?: string;
      columnWrapperClassName?: string;
    },
) {
  const renderCssElement = useCssElement as (
    component: React.ComponentType<
      React.ComponentProps<typeof RNFlatList<ItemT>>
    >,
    elementProps: typeof props,
    configuration: Record<string, string>,
  ) => React.ReactElement;
  return renderCssElement(RNFlatList<ItemT>, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
    columnWrapperClassName: 'columnWrapperStyle',
  });
}
export const SectionList = cssElement(RNSectionList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});

export const useCSSVariable =
  process.env.EXPO_OS === 'web'
    ? (variable: string) => `var(${variable})`
    : useNativeVariable;
