import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
// Re-prompt after 30 days if the user dismissed
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISSED_KEY);
    if (!val) {
      return false;
    }
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

function isIOSDevice(): boolean {
  const ua = navigator.userAgent;
  const hasIOSUA = /iPad|iPhone|iPod/.test(ua);
  const isIPadDesktopUA =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return hasIOSUA || isIPadDesktopUA;
}

function isSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isIOSNonSafari, setIsIOSNonSafari] = useState(false);
  // Start hidden; reveal after client-side checks pass
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Already running as an installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    if (isDismissed()) {
      return;
    }
    setDismissed(false);

    // iOS requires manual install instructions; only Safari has Add to Home Screen.
    if (isIOSDevice()) {
      if (isSafariBrowser()) {
        setIsIOSSafari(true);
      } else {
        setIsIOSNonSafari(true);
      }
    }

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt || isInstalling) {
      return;
    }
    const promptEvent = installPrompt;
    setInstallPrompt(null);
    setIsInstalling(true);

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      } else {
        recordDismissal();
        setDismissed(true);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const onDismiss = () => {
    recordDismissal();
    setDismissed(true);
  };

  const showBanner =
    !isInstalled &&
    !dismissed &&
    (!!installPrompt || isIOSSafari || isIOSNonSafari);

  return {
    showBanner,
    isInstalling,
    isIOSSafari,
    isIOSNonSafari,
    install,
    onDismiss,
  };
}
