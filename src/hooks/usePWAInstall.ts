import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
// Re-prompt after 30 days if the user dismissed
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISSED_KEY);
    if (!val) return false;
    return Date.now() < parseInt(val, 10);
  } catch {
    return false;
  }
}

function recordDismissal(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_TTL_MS));
  } catch {
    // ignore
  }
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  // Start hidden; reveal after client-side checks pass
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Already running as an installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    if (isDismissed()) return;
    setDismissed(false);

    // Detect iOS Safari — no beforeinstallprompt, requires manual instructions
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
    if (isIOS && isSafari) {
      setIsIOSSafari(true);
    }

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  const onDismiss = () => {
    recordDismissal();
    setDismissed(true);
  };

  const showBanner =
    !isInstalled && !dismissed && (!!installPrompt || isIOSSafari);

  return { showBanner, isIOSSafari, install, onDismiss };
}
