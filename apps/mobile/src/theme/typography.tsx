import { Orbitron_700Bold } from "@expo-google-fonts/orbitron";
import { useFonts } from "expo-font";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

type TypographyContextValue = {
  titleFontFamily?: string;
};

const TypographyContext = createContext<TypographyContextValue>({});

export function TypographyProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
  });
  const value = useMemo<TypographyContextValue>(
    () => ({
      titleFontFamily: fontsLoaded ? "Orbitron_700Bold" : undefined,
    }),
    [fontsLoaded],
  );

  return (
    <TypographyContext.Provider value={value}>
      {children}
    </TypographyContext.Provider>
  );
}

export function useTypography() {
  return useContext(TypographyContext);
}
