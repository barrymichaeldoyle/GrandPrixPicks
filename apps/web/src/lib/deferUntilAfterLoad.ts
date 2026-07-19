/**
 * Runs non-critical work only after the initial document and its resources have
 * loaded, then yields once more for an idle main-thread window.
 */
export function deferUntilAfterLoad(callback: () => void) {
  let idleCallbackId: number | undefined;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;

  function runWhenIdle() {
    if ('requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(callback, { timeout: 2_000 });
      return;
    }
    timeoutId = globalThis.setTimeout(callback, 1_000);
  }

  if (document.readyState === 'complete') {
    runWhenIdle();
  } else {
    window.addEventListener('load', runWhenIdle, { once: true });
  }

  return () => {
    window.removeEventListener('load', runWhenIdle);
    if (idleCallbackId !== undefined) {
      window.cancelIdleCallback(idleCallbackId);
    }
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
  };
}
