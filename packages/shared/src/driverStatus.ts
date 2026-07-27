/**
 * How a driver ended a session, when they are not a ranked finisher.
 *
 * The official classification ranks finishers and DNFs but leaves non-starters
 * out entirely. We keep every driver in our stored classification so teammate
 * Head-to-Head always has an order to read, and record the status alongside so
 * the UI never implies a retired driver "finished" at their tail position.
 */
export const DRIVER_STATUSES = ['dnf', 'dns', 'dsq', 'nc'] as const;

export type DriverStatus = (typeof DRIVER_STATUSES)[number];

/** Short badge text, e.g. in a results table position column. */
export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  dnf: 'DNF',
  dns: 'DNS',
  dsq: 'DSQ',
  nc: 'NC',
};

export const DRIVER_STATUS_DESCRIPTIONS: Record<DriverStatus, string> = {
  dnf: 'Did not finish',
  dns: 'Did not start',
  dsq: 'Disqualified',
  nc: 'Not classified',
};

export function isDriverStatus(value: unknown): value is DriverStatus {
  return (
    typeof value === 'string' &&
    (DRIVER_STATUSES as ReadonlyArray<string>).includes(value)
  );
}

/**
 * Whether a driver took part at all. A Head-to-Head matchup where neither
 * driver started has no result to read, so it is dropped from the player's
 * total rather than being decided by tail order.
 */
export function didParticipate(status: DriverStatus | undefined): boolean {
  return status !== 'dns';
}
