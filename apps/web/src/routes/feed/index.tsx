import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * `/feed` used to be a standalone activity page. It was the same stream as the
 * dashboard's Activity section, so the page went and the stream stayed — see
 * `components/feed/FeedContent.tsx`.
 *
 * This redirect is not tidiness: session-locked push notifications were sent
 * with a `/feed` URL (`push.ts`), and those are already sitting on people's
 * devices where we cannot recall them. Anyone tapping one lands on the
 * dashboard, which is where the feed they were promised now lives.
 *
 * `/feed/$feedEventId` is untouched — reaction pushes and notification-bell
 * items still deep-link to individual events.
 */
export const Route = createFileRoute('/feed/')({
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true });
  },
});
