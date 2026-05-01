import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/tokens';

const SIZES = {
  sm: 24,
  md: 36,
  lg: 48,
} as const;

type AvatarProps = {
  imageUrl?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ imageUrl, name, size = 'md' }: AvatarProps) {
  const px = SIZES[size];
  const fontSize = size === 'sm' ? 9 : size === 'md' ? 13 : 17;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.base, { width: px, height: px, borderRadius: px / 2 }]}
      />
    );
  }

  const initials = name ? getInitials(name) : '?';

  return (
    <View
      style={[
        styles.base,
        styles.placeholder,
        { width: px, height: px, borderRadius: px / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.text,
    fontWeight: '700',
  },
  placeholder: {
    backgroundColor: colors.surfaceMuted,
  },
});
