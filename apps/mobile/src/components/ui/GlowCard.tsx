import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '../../theme/tokens';

/**
 * GlowCard — the mobile counterpart to the web's multi-layer cyan halo
 * (`shadow-[0_0_0_1px_rgba(45,212,191,0.68),0_0_12px_4px_rgba(20,184,166,0.18),0_18px_36px_rgba(15,118,110,0.24)]`).
 *
 * React Native only supports one shadow per view, so we approximate the
 * effect by stacking:
 *  - outer view: bigger, lower-opacity teal shadow ("halo")
 *  - inner view: 3px teal-accent border + faint translucent teal background
 *
 * `intensity` lets callers dial the look from `'subtle'` (resting state)
 * to `'strong'` (next/active state).
 */

type GlowCardProps = {
  children: ReactNode;
  intensity?: 'subtle' | 'strong';
  style?: StyleProp<ViewStyle>;
};

export function GlowCard({
  children,
  intensity = 'strong',
  style,
}: GlowCardProps) {
  const shadowOpacity = intensity === 'strong' ? 0.55 : 0.25;
  const shadowRadius = intensity === 'strong' ? 18 : 10;
  const borderColor =
    intensity === 'strong'
      ? 'rgba(45, 212, 191, 0.7)'
      : 'rgba(45, 212, 191, 0.35)';
  const bgTint =
    intensity === 'strong'
      ? 'rgba(20, 184, 166, 0.08)'
      : 'rgba(20, 184, 166, 0.04)';

  return (
    <View
      style={[
        styles.halo,
        { shadowOpacity, shadowRadius },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          { backgroundColor: bgTint, borderColor },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    borderRadius: radii.xl,
    // iOS shadow (the halo)
    shadowColor: colors.accent,
    shadowOffset: { height: 6, width: 0 },
    // Android elevation fallback — single-color drop, less precise but visible
    elevation: 8,
  },
  inner: {
    borderRadius: radii.xl,
    borderWidth: 2,
    overflow: 'hidden',
  },
});
