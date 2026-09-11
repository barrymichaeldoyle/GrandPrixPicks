import { optimisticallyUpdateValueInPaginatedQuery } from 'convex/react';

import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';

type NotificationStore = Parameters<
  typeof optimisticallyUpdateValueInPaginatedQuery
>[0];

export function applyMarkReadToStore(
  store: NotificationStore,
  notificationId: ConvexId<'inAppNotifications'>,
) {
  let markedUnread = false;
  optimisticallyUpdateValueInPaginatedQuery(
    store,
    api.inAppNotifications.getMyNotifications,
    {},
    (current) => {
      if (
        String(current._id) !== String(notificationId) ||
        current.readAt !== undefined
      ) {
        return current;
      }
      markedUnread = true;
      return { ...current, readAt: Date.now() };
    },
  );

  if (!markedUnread) {
    return;
  }

  const unread = store.getQuery(api.inAppNotifications.getMyUnreadCount, {});
  if (unread && unread.count > 0) {
    store.setQuery(
      api.inAppNotifications.getMyUnreadCount,
      {},
      {
        ...unread,
        count: unread.count - 1,
      },
    );
  }
}

export function applyMarkAllReadToStore(store: NotificationStore) {
  const now = Date.now();
  optimisticallyUpdateValueInPaginatedQuery(
    store,
    api.inAppNotifications.getMyNotifications,
    {},
    (current) =>
      current.readAt !== undefined ? current : { ...current, readAt: now },
  );

  const unread = store.getQuery(api.inAppNotifications.getMyUnreadCount, {});
  if (unread) {
    store.setQuery(
      api.inAppNotifications.getMyUnreadCount,
      {},
      {
        count: 0,
        hasMore: false,
      },
    );
  }
}
