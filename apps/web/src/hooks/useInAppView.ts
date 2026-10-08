import { useLocation } from '@tanstack/react-router';

import { isInAppView } from '@/lib/bareRoutes';

/**
 * Whether the page is open in the mobile app's in-app browser (`?app=1`).
 *
 * The shell already drops its chrome there. Pages use this for what is left
 * inside them that points back into the web app: a picks form or a button to
 * one, "Back to home". The player is a tap from the app's own picks, and
 * picking here would mean signing in to the website inside the app.
 */
export function useInAppView(): boolean {
  return useLocation({ select: (location) => isInAppView(location.searchStr) });
}
