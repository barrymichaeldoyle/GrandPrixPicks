/**
 * How many notifications one page of the in-app history holds.
 *
 * Shared so web and mobile ask for the same page size, and so a "load more"
 * step is the same size everywhere. The unread badge is counted separately
 * (`getMyUnreadCount`) and is not bounded by this.
 */
export const NOTIFICATION_PAGE_SIZE = 20;
