import { describe, expect, it } from 'vitest';

import { BAKU_CRASHES, BAKU_DRIVERS } from './bakuCrashes';
import { organizationSchema } from './site';
import {
  BAKU_DATASET_DRIVER_COUNT,
  BAKU_DATASET_INCIDENT_COUNT,
  BAKU_DATASET_PATH,
  bakuCrashDatasetSchema,
} from './bakuDataset';

/**
 * The counts in the schema are literals so the archive stays out of the client
 * entry, which every page downloads. This is the test that makes that trade
 * safe: edit the archive without editing the constants and it fails here rather
 * than shipping a page that overstates its own dataset.
 */
describe('baku dataset schema', () => {
  it('states the real incident count', () => {
    expect(BAKU_DATASET_INCIDENT_COUNT).toBe(BAKU_CRASHES.length);
  });

  it('states the real driver count', () => {
    const drivers = new Set(BAKU_CRASHES.flatMap((crash) => crash.drivers));
    expect(BAKU_DATASET_DRIVER_COUNT).toBe(drivers.size);
    expect(BAKU_DATASET_DRIVER_COUNT).toBe(Object.keys(BAKU_DRIVERS).length);
  });

  it('points its download at the route that serves the data', () => {
    // Dataset markup promises the data is obtainable. A contentUrl that does
    // not match the handler's path is a claim the site cannot back.
    const schema = bakuCrashDatasetSchema(
      '/f1-2026-azerbaijan-grand-prix-predictions',
    );
    expect(schema.distribution.contentUrl).toContain(BAKU_DATASET_PATH);
    expect(schema.distribution.encodingFormat).toBe('application/json');
  });

  it('says it is free and names a licence', () => {
    const schema = bakuCrashDatasetSchema('/x');
    expect(schema.isAccessibleForFree).toBe(true);
    expect(schema.license).toMatch(/^https:\/\//);
  });

  it('references the organization entity rather than restating it', () => {
    // A second, half-populated Organization node is what the SEO invariants
    // test catches, and an `@id` that does not match the real one is a
    // dangling reference nothing resolves.
    const schema = bakuCrashDatasetSchema('/x');
    expect(schema.creator).toEqual({ '@id': organizationSchema()['@id'] });
    expect(schema.creator).not.toHaveProperty('@type');
  });
});
