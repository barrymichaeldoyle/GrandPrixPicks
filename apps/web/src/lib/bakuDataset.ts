import { organizationSchema, siteConfig } from './site';

/**
 * `Dataset` markup for the Baku crash archive, and the facts it needs.
 *
 * Kept apart from `bakuCrashes.ts` on purpose. TanStack keeps a route's `head`
 * in the client entry, so anything the schema touches is downloaded by every
 * visitor to the site rather than by readers of one write-up. Importing the
 * archive here to read `.length` off it would drag thirty kilobytes of incident
 * prose into that entry, which is the mistake that once cost 50KB of guide copy.
 *
 * Hence the literal count. `bakuDataset.test.ts` asserts it against the archive,
 * so the saving does not come at the price of a number that can quietly go
 * wrong.
 */

export const BAKU_DATASET_PATH = '/data/baku-crashes.json';

/** Incidents in `BAKU_CRASHES`. Checked by test, not by hand. */
export const BAKU_DATASET_INCIDENT_COUNT = 57;

/** Distinct drivers in the archive. Checked by the same test. */
export const BAKU_DATASET_DRIVER_COUNT = 31;

/**
 * The schema is worth carrying only because the data is genuinely downloadable:
 * `Dataset`'s own guidelines expect a `distribution` that resolves, and
 * describing a dataset nobody can fetch is a claim the site does not back.
 *
 * Do not expect traffic from Google Dataset Search. The download is the point,
 * because a citable file is the kind of thing that earns a referring domain,
 * and referring domains are what this site is actually short of.
 */
export function bakuCrashDatasetSchema(pagePath: string) {
  return {
    '@type': 'Dataset',
    '@id': `${siteConfig.url}${pagePath}#baku-crashes`,
    name: 'Notable crashes at the Baku City Circuit, 2016 to 2025',
    description: `Every crash and collision at the Baku City Circuit that ended in a red flag, a retirement or a stewards collision note, across the nine Formula 1 weekends held there. ${BAKU_DATASET_INCIDENT_COUNT} incidents involving ${BAKU_DATASET_DRIVER_COUNT} drivers, each with the session, the corner where the car stopped, and a citation. Curated rather than exhaustive: race control names a turn for car-to-car collisions but logs a solo wall hit as a bare red flag, so the set was researched per weekend.`,
    url: `${siteConfig.url}${pagePath}`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    /*
     * A pure `@id` reference, not a restatement. `organizationSchema` owns the
     * entity and `site.ts` is explicit that anything in a graph should point at
     * `#organization` rather than describe it again. Carrying a `@type` here
     * would make this look like a second, half-populated Organization, which is
     * exactly what the SEO invariant test flags.
     */
    creator: { '@id': organizationSchema()['@id'] },
    temporalCoverage: '2016/2025',
    spatialCoverage: {
      '@type': 'Place',
      name: 'Baku City Circuit',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Baku',
        addressCountry: 'AZ',
      },
    },
    variableMeasured: [
      'year',
      'session',
      'drivers',
      'corner',
      'outcome',
      'source',
    ],
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `${siteConfig.url}${BAKU_DATASET_PATH}`,
    },
  };
}
