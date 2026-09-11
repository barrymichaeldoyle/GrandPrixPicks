import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { listRaceWriteups } from './raceWriteups';
import {
  circuitPageRedirectTarget,
  racePageWriteupHeadOptions,
  raceWriteupPageHead,
} from './raceWriteupSeo';

describe('racePageWriteupHeadOptions', () => {
  it('canonicalises a race page with a write-up to the write-up, noindexed', () => {
    expect(racePageWriteupHeadOptions('italy-2026')).toEqual({
      canonicalPath: '/f1-2026-italian-grand-prix-predictions',
      noIndex: true,
    });
    expect(racePageWriteupHeadOptions('madrid-2026')).toEqual({
      canonicalPath: '/f1-2026-madrid-grand-prix-predictions',
      noIndex: true,
    });
  });

  it('leaves a race page without a write-up self-canonical and indexable', () => {
    expect(racePageWriteupHeadOptions('miami-2026')).toBeNull();
  });
});

describe('circuitPageRedirectTarget', () => {
  it('sends a circuit with a write-up to that write-up', () => {
    expect(circuitPageRedirectTarget('madring')).toBe(
      '/f1-2026-madrid-grand-prix-predictions',
    );
    expect(circuitPageRedirectTarget('monza')).toBe(
      '/f1-2026-italian-grand-prix-predictions',
    );
    expect(circuitPageRedirectTarget('sepang')).toBe(
      '/f1-2026-bahrain-grand-prix-predictions',
    );
  });

  it('leaves circuits without a write-up on the calendar', () => {
    // Barcelona is the other Spanish round; its slug is still spain-2026.
    expect(circuitPageRedirectTarget('barcelona')).toBe('/races');
    expect(circuitPageRedirectTarget('sakhir')).toBe('/races');
    expect(circuitPageRedirectTarget('unknown-circuit')).toBe('/races');
  });
});

/**
 * Every write-up route on disk is in the registry.
 *
 * The checks around write-ups all iterate `listRaceWriteups()`, so they read
 * outward from the registry and a route file that was never registered is
 * invisible to all of them. That file is the one shape that puts two
 * indexable pages on the same query: `getRaceWriteup` returns null for the
 * weekend, so the race page keeps asking to be indexed and stays in the
 * sitemap, while the new write-up asks to be indexed too. It is also an orphan
 * on the day it ships, which is the bug `raceWriteups.ts` was written to end.
 *
 * Reading the directory is what makes this catch the omission: deriving the
 * list from the registry would be the same blind spot in a second place.
 */
describe('write-up route registration', () => {
  const ROUTE_FILE = /^f1-\d{4}-.+-grand-prix-predictions\.tsx$/;

  it('registers every write-up route file in RACE_WRITEUPS', () => {
    const onDisk = readdirSync(`${process.cwd()}/src/routes`)
      .filter((file) => ROUTE_FILE.test(file))
      .map((file) => `/${file.replace(/\.tsx$/, '')}`);
    const registered = new Set(listRaceWriteups().map((writeup) => writeup.to));

    expect(onDisk.length).toBeGreaterThan(0);
    expect(
      onDisk.filter((route) => !registered.has(route)),
      'unregistered write-up routes compete with their own race page',
    ).toEqual([]);
  });
});

describe('raceWriteupPageHead', () => {
  const faqs = [
    {
      question: 'When is the 2026 Spanish Grand Prix in Madrid?',
      answer: 'The Spanish Grand Prix runs from 11 to 13 September 2026.',
    },
  ];

  it('picks the live description until the race is finished or cancelled', () => {
    const result = raceWriteupPageHead({
      path: '/f1-2026-madrid-grand-prix-predictions',
      raceSlug: 'madrid-2026',
      title: '2026 Spanish Grand Prix Predictions | Madrid',
      description: {
        live: 'Pick a top 5 at the Madring.',
        finished: 'Scored against the official classification.',
        cancelled: 'The 2026 Spanish Grand Prix was called off.',
      },
      imageAlt: 'The Madrid race card.',
      reviewedAt: Date.parse('2026-09-10T00:00:00Z'),
      eventName: '2026 Spanish Grand Prix',
      eventAlternateName: '2026 Madrid Grand Prix',
      breadcrumbName: 'Spanish Grand Prix predictions',
      race: { status: 'upcoming', raceStartAt: 1_789_304_400_000 },
      faqs,
    });

    const titleTag = result.meta?.find((tag) => 'title' in tag) as
      | { title: string }
      | undefined;
    expect(titleTag?.title).toBe(
      '2026 Spanish Grand Prix Predictions | Madrid',
    );
    const descriptionTag = result.meta?.find(
      (tag) => 'name' in tag && tag.name === 'description',
    ) as { content: string } | undefined;
    expect(descriptionTag?.content).toBe('Pick a top 5 at the Madring.');

    const graph = JSON.parse(result.scripts?.[0]?.children as string) as {
      '@graph': Record<string, unknown>[];
    };
    const page = graph['@graph'][0] as {
      about: { name: string; alternateName: string };
    };
    expect(page.about.name).toBe('2026 Spanish Grand Prix');
    expect(page.about.alternateName).toBe('2026 Madrid Grand Prix');
    expect(graph['@graph'][1]?.['@type']).toBe('FAQPage');
  });

  it('uses the finished description once results are published', () => {
    const result = raceWriteupPageHead({
      path: '/f1-2026-italian-grand-prix-predictions',
      raceSlug: 'italy-2026',
      title: '2026 Italian Grand Prix Predictions & Picks',
      description: {
        live: 'Pick a top 5 at Monza.',
        finished: 'Scored against the official Monza classification.',
        cancelled: 'The 2026 Italian Grand Prix was called off.',
      },
      imageAlt: 'The Monza race card.',
      reviewedAt: Date.parse('2026-09-08T00:00:00Z'),
      eventName: '2026 Italian Grand Prix',
      breadcrumbName: 'Italian Grand Prix predictions',
      race: { status: 'finished', raceStartAt: 1_788_000_000_000 },
      faqs,
    });

    const descriptionTag = result.meta?.find(
      (tag) => 'name' in tag && tag.name === 'description',
    ) as { content: string } | undefined;
    expect(descriptionTag?.content).toBe(
      'Scored against the official Monza classification.',
    );
  });

  it('appends extra graph nodes a page actually owns', () => {
    const result = raceWriteupPageHead({
      path: '/f1-2026-azerbaijan-grand-prix-predictions',
      raceSlug: 'azerbaijan-2026',
      title: '2026 Azerbaijan Grand Prix Predictions & Picks | Baku',
      description: {
        live: 'Pick a top 5 in Baku.',
        finished: 'Scored against the official Baku classification.',
        cancelled: 'The 2026 Azerbaijan Grand Prix was called off.',
      },
      imageAlt: 'The Baku race card.',
      reviewedAt: Date.parse('2026-09-08T00:00:00Z'),
      eventName: '2026 Azerbaijan Grand Prix',
      breadcrumbName: 'Azerbaijan Grand Prix predictions',
      faqs,
      extraGraph: [{ '@type': 'Dataset', name: 'Baku crashes' }],
    });

    const graph = JSON.parse(result.scripts?.[0]?.children as string) as {
      '@graph': Record<string, unknown>[];
    };
    expect(graph['@graph'].at(-1)).toEqual({
      '@type': 'Dataset',
      name: 'Baku crashes',
    });
  });
});
