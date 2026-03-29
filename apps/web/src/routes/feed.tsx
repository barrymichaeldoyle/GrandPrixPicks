import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/feed')({
  component: FeedLayout,
});

function FeedLayout() {
  return <Outlet />;
}
