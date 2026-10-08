// The one place the raw icon set is imported; everything else uses this.
// oxlint-disable-next-line no-restricted-imports
import { Ionicons as ExpoIonicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

/**
 * Ionicons, kept out of VoiceOver.
 *
 * An icon font draws each glyph as a character from the Private Use Area, and
 * iOS builds a button's label from the text inside it, so every icon became
 * part of what VoiceOver read: "Make your picks, " with a stray separator,
 * ", Edit", and a blank stop for each icon on its own. Nearly every icon here
 * sits beside a word that already says what it means.
 *
 * An icon that is the whole control (a close or remove button) still needs an
 * `accessibilityLabel` on the Pressable around it, not on the icon.
 */
export function Ionicons(props: ComponentProps<typeof ExpoIonicons>) {
  return (
    <ExpoIonicons
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...props}
    />
  );
}
