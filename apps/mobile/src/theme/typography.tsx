import {
  Orbitron_500Medium,
  Orbitron_700Bold,
  Orbitron_900Black,
} from '@expo-google-fonts/orbitron';
import { useFonts } from 'expo-font';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

type TypographyContextValue = {
  /** Wordmark / hero titles. */
  titleFontFamily?: string;
  /** Medium-weight Orbitron — large numerals (positions, scores). */
  numeralFontFamily?: string;
  /** Black-weight Orbitron — display numerals (hero countdowns). */
  displayFontFamily?: string;
};

const TypographyContext = createContext<TypographyContextValue>({});

export function TypographyProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded] = useFonts({
    Orbitron_500Medium,
    Orbitron_700Bold,
    Orbitron_900Black,
  });
  const value: TypographyContextValue = {
    titleFontFamily: fontsLoaded ? 'Orbitron_700Bold' : undefined,
    numeralFontFamily: fontsLoaded ? 'Orbitron_500Medium' : undefined,
    displayFontFamily: fontsLoaded ? 'Orbitron_900Black' : undefined,
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
