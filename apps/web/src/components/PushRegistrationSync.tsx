import { api } from '@convex-generated/api';
import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect } from 'react';

import { useQuery } from '@/integrations/convex/query';

/** Rebind existing browser subscriptions when the authenticated account changes. */
export function PushRegistrationSync() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : 'skip');
  const save = useMutation(api.push.saveSubscription);
  const markOpened = useMutation(api.notificationDelivery.markOpened);
  useEffect(() => {
    if (!isAuthenticated || !user?._id || !('serviceWorker' in navigator)) {
      return;
    }
    let cancelled = false;
    async function refresh() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (cancelled || !subscription) {
          return;
        }
        const json = subscription.toJSON();
        if (json.keys?.auth && json.keys?.p256dh) {
          await save({
            endpoint: subscription.endpoint,
            auth: json.keys.auth,
            p256dh: json.keys.p256dh,
          });
        }
      } catch (error) {
        console.warn('[push] subscription refresh failed', error);
      }
    }
    void refresh();
    function onVisible() {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    const url = new URL(window.location.href);
    const id = url.searchParams.get('notificationDelivery');
    if (id) {
      void markOpened({
        deliveryId: id as Parameters<typeof markOpened>[0]['deliveryId'],
      }).catch(() => {});
      url.searchParams.delete('notificationDelivery');
      window.history.replaceState(window.history.state, '', url);
    }
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, user?._id, save, markOpened]);
  return null;
}
