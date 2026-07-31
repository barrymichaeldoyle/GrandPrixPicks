// Per-weight subpaths, not the package root. Importing named exports from the
// root drags every weight and italic into the bundle — Metro does not
// tree-shake these packages, and the root index `require`s all 18 Archivo and
// 14 IBM Plex Mono files. That took the export from 19 bundled font files to
// 51. Five subpath imports ship exactly five.
import { Archivo_300Light } from '@expo-google-fonts/archivo/300Light';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { useFonts } from 'expo-font';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

/**
 * Archivo for text, IBM Plex Mono for every figure, matching
 * `packages/shared/src/tokens.ts` and the web app.
 *
 * This was three weights of Orbitron. Orbitron was deleted from the design
 * system in the reskin, but mobile kept loading it, so titles and numerals here
 * were still set in a typeface the product no longer uses. Weights stop at 600
 * for the same reason they do on web: nothing should be heavier than a primary
 * button, so the old `Orbitron_900Black` display weight has no counterpart.
 */
type TypographyContextValue = {
  /** Wordmark / hero titles. */
  titleFontFamily?: string;
  /** Figures at body size: positions, scores, times. */
  numeralFontFamily?: string;
  /** Figures at hero size: countdowns, big scores. */
  displayFontFamily?: string;
};

const TypographyContext = createContext<TypographyContextValue>({});

export function TypographyProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded] = useFonts({
    Archivo_300Light,
    Archivo_400Regular,
    Archivo_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_600SemiBold,
  });
  const value: TypographyContextValue = {
    titleFontFamily: fontsLoaded ? 'Archivo_600SemiBold' : undefined,
    numeralFontFamily: fontsLoaded ? 'IBMPlexMono_400Regular' : undefined,
    // The hero countdown is the one figure that carries weight as well as size;
    // semibold is the top of the loaded range.
    displayFontFamily: fontsLoaded ? 'IBMPlexMono_600SemiBold' : undefined,
  };

  return (
    <TypographyContext.Provider value={value}>
      {children}
    </TypographyContext.Provider>
  );
}

export function useTypography() {
  return useContext(TypographyContext);
}
