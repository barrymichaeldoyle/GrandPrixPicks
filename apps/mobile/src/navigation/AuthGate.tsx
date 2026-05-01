import { useUser } from '@clerk/clerk-expo';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useMobileConfig } from '../providers/mobile-config';
import { colors } from '../theme/tokens';

type AuthGateProps = {
  fallback: ReactNode;
  children: ReactNode;
};

export function AuthGate({ fallback, children }: AuthGateProps) {
  const { clerkEnabled } = useMobileConfig();

  // Without Clerk configured (dev mode), skip auth entirely
  if (!clerkEnabled) {
    return <>{children}</>;
  }

  return <ClerkAuthGate fallback={fallback}>{children}</ClerkAuthGate>;
}

function ClerkAuthGate({ fallback, children }: AuthGateProps) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loader: {
    alignItems: 'center',
    backgroundColor: colors.page,
    flex: 1,
    justifyContent: 'center',
  },
});
