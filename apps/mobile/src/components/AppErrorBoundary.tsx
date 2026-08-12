import { Component, type ReactNode } from 'react';

import { Sentry } from '../lib/sentry';
import { PrimaryButton } from './ui/PrimaryButton';
import { Text, View } from '../tw';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Catches a render crash and offers a way out.
 *
 * Without one, a thrown error in any screen unmounts the whole tree and leaves
 * a blank screen with no route back: on the web that is a reload away, on a
 * phone it means force-quitting the app. Sentry was already wired, so the
 * crash was being reported and the person holding the phone still had nothing
 * to do about it.
 *
 * Deliberately a class: React has no hook equivalent for error boundaries.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View className="flex-1 items-center justify-center gap-4 bg-page px-8">
        <Text className="text-foreground text-center text-xl font-bold">
          Something went wrong
        </Text>
        <Text className="text-muted text-center text-sm leading-5">
          The app hit an unexpected error. It has been reported. Trying again
          usually clears it.
        </Text>
        <View className="w-full pt-2">
          <PrimaryButton
            icon={null}
            label="Try again"
            onPress={() => this.setState({ hasError: false })}
          />
        </View>
      </View>
    );
  }
}
