import { lazy } from 'react';

/**
 * The team-mate picker, loaded on demand, shared by every surface that shows it.
 *
 * Four files used to each declare their own `lazy()` over the same module. The
 * chunk was shared, but each `lazy` object tracks its own status, so a form
 * already loaded on the dashboard still suspended the first time the summary
 * overlay or a write-up rendered it. One object means one load.
 */
let h2hFormModule: Promise<
  typeof import('@/components/H2HPredictionForm')
> | null = null;

/**
 * Start (or join) the load. Callers preload with it ahead of the step that
 * needs the form, so the hand-off from the Top 5 does not show a fallback.
 * Idempotent: the module cache dedupes, this just names the promise.
 */
export function loadH2HPredictionForm() {
  h2hFormModule ??= import('@/components/H2HPredictionForm');
  return h2hFormModule;
}

export const LazyH2HPredictionForm = lazy(() =>
  loadH2HPredictionForm().then((module) => ({
    default: module.H2HPredictionForm,
  })),
);
