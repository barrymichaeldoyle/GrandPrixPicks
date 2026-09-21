import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { WeekendCardSkeleton } from '@/components/WeekendCardSkeleton';
import { DashboardWeekendPicksReady } from '@/routes/-dashboard/DashboardWeekendPicks';
import { weekendPicksReady } from '@/routes/-dashboard/dashboardState';

export function UpcomingPicksModal({
  raceSlug,
  raceName,
  onClose,
}: {
  raceSlug: string;
  raceName: string;
  onClose: () => void;
}) {
  const weekend = useQuery(api.races.getCurrentWeekend, {});

  if (
    !weekendPicksReady(weekend) ||
    !weekend ||
    weekend.race.slug !== raceSlug
  ) {
    return (
      <PicksFocusOverlay open onClose={onClose} title={raceName}>
        {weekend === undefined || !weekendPicksReady(weekend) ? (
          <WeekendCardSkeleton />
        ) : (
          <p className="pb-4 text-sm text-text-muted">
            No prediction window is open
          </p>
        )}
      </PicksFocusOverlay>
    );
  }

  return (
    <DashboardWeekendPicksReady
      weekend={weekend}
      weather={null}
      initialDrivers={[]}
      leading={false}
      onModalClose={onClose}
    />
  );
}
