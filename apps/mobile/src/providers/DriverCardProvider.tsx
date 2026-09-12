import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { DriverIdentity } from '../components/ui/DriverCard';
import { DriverCard, hasDriverDetail } from '../components/ui/DriverCard';

type DriverCardContextValue = {
  /** Open the card for a driver. A chip with nothing to add is ignored. */
  showDriver: (driver: DriverIdentity) => void;
};

const DriverCardContext = createContext<DriverCardContextValue | null>(null);

/**
 * One driver card for the whole app, opened from any chip.
 *
 * A context rather than a modal per chip: a session card can carry twenty-odd
 * chips, and each one owning its own `Modal` would mount twenty modals to show
 * at most one. The chips only report which driver was tapped.
 */
export function DriverCardProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<DriverIdentity | null>(null);

  function showDriver(next: DriverIdentity) {
    if (!hasDriverDetail(next)) {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDriver(next);
  }

  return (
    <DriverCardContext.Provider value={{ showDriver }}>
      {children}
      <DriverCard driver={driver} onDismiss={() => setDriver(null)} />
    </DriverCardContext.Provider>
  );
}

/**
 * Fails soft, like `useToast`: a chip rendered outside the provider stays a
 * chip rather than crashing the screen it is on.
 */
export function useDriverCard(): DriverCardContextValue {
  return useContext(DriverCardContext) ?? { showDriver: () => {} };
}
