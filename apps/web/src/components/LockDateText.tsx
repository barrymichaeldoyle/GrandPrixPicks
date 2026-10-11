import { Suspense, use } from 'react';
import { browser } from 'react-dom';

import {
  type formatRaceLocalLockDate,
  formatViewerLockDate,
} from '@/lib/raceLockTime';

type LockDate = NonNullable<ReturnType<typeof formatRaceLocalLockDate>>;

function ViewerLockDate({
  lockAt,
  separator,
  trackDate,
}: {
  lockAt: number;
  separator: string;
  trackDate: LockDate;
}) {
  use(browser());
  const date = formatViewerLockDate(lockAt) ?? trackDate;
  return (
    <>
      {date.date}
      {separator}
      {date.time}
    </>
  );
}

/**
 * A lock deadline that is safe to server-render: the track-local date goes into
 * the HTML, and the viewer's own zone replaces it once the browser has
 * hydrated. Formatting the viewer's zone during SSR prints UTC on Cloudflare and
 * makes React discard the server markup.
 */
export function LockDateText({
  lockAt,
  trackDate,
  separator = ' · ',
}: {
  lockAt: number;
  trackDate: LockDate;
  separator?: string;
}) {
  return (
    <Suspense
      fallback={
        <>
          {trackDate.date}
          {separator}
          {trackDate.time}
        </>
      }
    >
      <ViewerLockDate
        lockAt={lockAt}
        separator={separator}
        trackDate={trackDate}
      />
    </Suspense>
  );
}
