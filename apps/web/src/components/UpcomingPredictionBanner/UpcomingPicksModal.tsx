import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { WeekendCardSkeleton } from '@/components/WeekendCardSkeleton';
import { picksOverlayHeading } from '@/lib/picksOverlayHeading';
import { DashboardWeekendPicksReady } from '@/routes/-dashboard/DashboardWeekendPicks';
import { weekendPicksReady } from '@/routes/-dashboard/dashboardState';

/**
 * The reads the picker needs before it can draw its first frame.
 *
 * Shared with `UpcomingPicksPrefetch`, which subscribes to the same two
 * queries the moment a player reaches for the banner. The cached `useQuery`
 * keeps a subscription alive after its component unmounts, so by the time the
 * tap lands the picker usually opens straight onto the grid.
 */
function usePickerData() {
  const weekend = useQuery(api.races.getCurrentWeekend, {});
  const ready = weekendPicksReady(weekend) && weekend ? weekend : null;
  const drivers = useQuery(
    api.drivers.listDrivers,
    ready
      ? {
          round: ready.race.round,
          season: ready.race.season,
          includeNotRacing: true,
        }
      : 'skip',
  );
  return { weekend, ready, drivers };
}

export function UpcomingPicksPrefetch() {
  usePickerData();
  return null;
}

export function UpcomingPicksModal({
  raceSlug,
  step,
  onClose,
}: {
  raceSlug: string;
  step: 'top5' | 'h2h';
  onClose: () => void;
}) {
  const { weekend, ready, drivers } = usePickerData();

  // Hold the loading shell until the drivers are in too. Opening the picker
  // with an empty grid and filling it a beat later was one more stage of the
  // same load.
  if (!ready || ready.race.slug !== raceSlug || drivers === undefined) {
    const loading =
      weekend === undefined ||
      !weekendPicksReady(weekend) ||
      (ready?.race.slug === raceSlug && drivers === undefined);
    return (
      <PicksFocusOverlay open onClose={onClose} {...picksOverlayHeading(step)}>
        {loading ? (
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
      weekend={ready}
      weather={null}
      initialDrivers={drivers}
      leading={false}
      onModalClose={onClose}
    />
  );
}
