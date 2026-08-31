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

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [requiresManualInstall, setRequiresManualInstall] = useState(false);
  // Start hidden; reveal after client-side checks pass
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Already running as an installed PWA
    const iOSNavigator = navigator as Navigator & { standalone?: boolean };
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      iOSNavigator.standalone === true
    ) {
      // Installation mode is a browser capability discovered after hydration.
      // oxlint-disable-next-line react/set-state-in-effect
      setIsInstalled(true);
      return;
    }

    if (isDismissed()) {
      return;
    }
    setDismissed(false);

    // iOS/iPadOS browsers use the Share menu rather than
    // `beforeinstallprompt` for home-screen installation.
    if (isIOSDevice()) {
      setRequiresManualInstall(true);
    }

    function handleInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function install() {
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
    } catch {
      // Keep the action available if the browser rejected the prompt before
      // presenting it (for example, while another install UI was active).
      setInstallPrompt(promptEvent);
    } finally {
      setIsInstalling(false);
    }
  }

  function onDismiss() {
    recordDismissal();
    setDismissed(true);
  }

  const showBanner =
    !isInstalled && !dismissed && (!!installPrompt || requiresManualInstall);

  return {
    showBanner,
    isInstalling,
    requiresManualInstall,
    install,
    onDismiss,
  };
}
