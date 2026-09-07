import { BAKU_CRASHES, BAKU_DRIVER_NAMES } from '../../../src/lib/bakuCrashes';
import { siteConfig } from '../../../src/lib/site';

/**
 * The Baku crash archive, as a downloadable dataset.
 *
 * The write-up carries `Dataset` JSON-LD, and that markup makes a promise: the
 * schema's own guidelines expect the data to actually be obtainable. Describing
 * a dataset nobody can download is a claim the site does not back, so the
 * markup and this route ship together or neither ships.
 *
 * It is also the cheapest thing here that somebody might link to. Referring
 * domains are this site's measured bottleneck, not content and not indexation,
 * and a JSON file of a hand-researched archive is the shape of thing that gets
 * cited. That is the actual reason it exists; Google Dataset Search is a bonus
 * nobody should expect traffic from.
 *
 * Generated from `bakuCrashes.ts` rather than checked in beside it. The archive
 * is edited by hand about once a year, and a second copy would be a second
 * thing to remember: this way the download cannot disagree with the page.
 */

/** Cached hard: nine finished race weekends do not change between deploys. */
const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';

export default function handler() {
  const payload = {
    name: 'Notable crashes at the Baku City Circuit, 2016 to 2025',
    description:
      'Every crash and collision at the Baku City Circuit that ended in a red flag, a retirement or a stewards collision note, across the nine Formula 1 weekends held there. Each incident carries the drivers involved, the session, the corner where the car stopped, and a citation.',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    url: `${siteConfig.url}/f1-2026-azerbaijan-grand-prix-predictions`,
    /*
     * Stated rather than implied. The set is curated, and the reason it cannot
     * be exhaustive is a fact about the source: race control names a turn for
     * car-to-car collisions but logs a solo wall hit as a bare red flag with no
     * driver and no sector, so a machine-built list would be biased toward
     * racing incidents and would misplace the circuit's danger.
     */
    coverage: {
      circuit: 'Baku City Circuit',
      firstSeason: 2016,
      lastSeason: 2025,
      weekends: 9,
      note: 'The 2020 race was cancelled. 2016 ran as the European Grand Prix at this circuit. Practice and qualifying for 2018 are not covered: no contemporary session report was found.',
      exhaustive: false,
      inclusion:
        'Contact with a wall or another car that had a consequence: a red flag, a retirement, a stopped car, or a stewards collision note. Excludes lock-ups and escape-road excursions with no contact, and purely mechanical retirements.',
      attribution:
        'Corner is where the car stopped, not where the contact began. Where those differ, the note says so.',
    },
    incidentCount: BAKU_CRASHES.length,
    incidents: BAKU_CRASHES.map((crash) => ({
      id: crash.id,
      year: crash.year,
      event: crash.event,
      session: crash.session,
      ...(crash.lap === undefined ? {} : { lap: crash.lap }),
      drivers: crash.drivers.map((code) => ({
        code,
        name: BAKU_DRIVER_NAMES[code] ?? code,
      })),
      corner: crash.corner,
      outcome: crash.outcome,
      confidence: crash.confidence,
      note: crash.note,
      source: crash.source,
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'cache-control': CACHE_CONTROL,
      'content-type': 'application/json; charset=utf-8',
      // Cited from elsewhere by definition, so it has to be readable from there.
      'access-control-allow-origin': '*',
    },
  });
}
