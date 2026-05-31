import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { ToastState } from '../components/ui/Toast';
import { Toast } from '../components/ui/Toast';

type ToastVariant = 'success' | 'error' | 'info';

type ToastContextValue = {
  showToast: (message: string, variant: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Mounts a single root-level Toast and exposes `useToast()` so any screen can
 * trigger it without prop-drilling local state.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(message: string, variant: ToastVariant) {
    setToast({ message, variant, nonce: Date.now() });
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
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
      showToast: (message) => {
        console.warn('[Toast] no provider, message dropped:', message);
      },
    };
  }
  return ctx;
}
