import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import { PickConfetti } from '../components/ui/PickConfetti';
import type { ToastState } from '../components/ui/Toast';
import { Toast } from '../components/ui/Toast';

type ToastVariant = 'success' | 'error' | 'info';

type ToastContextValue = {
  toast: ToastState;
  dismissToast: () => void;
  celebratePicks: () => void;
  showToast: (message: string, variant: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Mounts a single root-level Toast and exposes `useToast()` so any screen can
 * trigger it without prop-drilling local state.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [confetti, setConfetti] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(message: string, variant: ToastVariant) {
    setToast({ message, variant, nonce: Date.now() });
  }
  function celebratePicks() {
    setConfetti((n) => n + 1);
  }

  return (
    <ToastContext.Provider
      value={{
        showToast,
        celebratePicks,
        toast,
        dismissToast: () => setToast(null),
      }}
    >
      {children}
      <PickConfetti nonce={confetti} />
      <Toast state={toast} onDismiss={() => setToast(null)} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft — log instead of crash if a screen renders outside the
    // provider (e.g. an isolated Storybook).
    return {
      toast: null,
      dismissToast: () => {},
      celebratePicks: () => {},
      showToast: (message) => {
        console.warn('[Toast] no provider, message dropped:', message);
      },
    };
  }
  return ctx;
}

/** Native modals sit above the root overlay, so render feedback in their window too. */
export function ModalToast() {
  const { toast, dismissToast } = useToast();
  return <Toast state={toast} onDismiss={dismissToast} />;
}
