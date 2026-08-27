/**
 * The AdSense client id. One copy, because the loader URL and every `<ins>`
 * slot have to name the same publisher or the slot silently never fills.
 */
export const ADSENSE_CLIENT = 'ca-pub-3482457944656598';

const SCRIPT_ID = 'gpp-adsense-script';
const SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/**
 * Whether ad slots may render at all.
 *
 * Off by default and switched on with `VITE_ADS_ENABLED`, so every slot in the
 * app is inert until the account is actually approved. An unapproved publisher
 * renders nothing anyway; the flag is what stops us reserving space and pulling
 * ~680 KB across four Google hosts for a slot that cannot fill.
 */
export function adsEnabled() {
  return import.meta.env.VITE_ADS_ENABLED === 'true';
}

let loadPromise: Promise<void> | null = null;

/**
 * Loads `adsbygoogle.js` once per document, whoever asks and however often.
 *
 * Two callers want this and they want it at different moments: the root loads
 * it after `load` plus an idle window so the code is discoverable on every
 * route while the account is under review, and {@link AdSlot} loads it when a
 * slot is about to scroll into view. Both go through here, so whichever happens
 * first wins and the second is free.
 *
 * That shared entry point is also the migration. Once ads are approved and
 * placed, deleting the root's call leaves the slots as the only trigger, and
 * then a page with no slot in view never pays for the script at all.
 *
 * Resolves on load and rejects on error rather than hanging, so a caller can
 * decide what to do about a blocked script instead of awaiting forever — an ad
 * blocker makes this the common path, not the rare one.
 */
export function ensureAdSenseLoaded(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('AdSense cannot load outside a document'));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`#${SCRIPT_ID}`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = SCRIPT_SRC;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        // Let a later slot retry rather than caching the failure for the life
        // of the page: the usual cause is an ad blocker, but a dropped request
        // on a flaky connection looks identical here.
        loadPromise = null;
        script.remove();
        reject(new Error('AdSense script failed to load'));
      },
      { once: true },
    );
    document.head.append(script);
  });

  return loadPromise;
}

/** Test seam: forget any in-flight or completed load. */
export function resetAdSenseLoaderForTests() {
  loadPromise = null;
}

/**
 * Ad unit ids, by placement.
 *
 * Config rather than constants because these do not exist until the account is
 * approved and the units are created in the AdSense UI. An unset id renders
 * nothing, so the placements can sit in the tree before the ids do.
 */
export const AD_SLOTS = {
  dashboardFeed: import.meta.env.VITE_ADS_SLOT_DASHBOARD_FEED as
    | string
    | undefined,
} as const;
