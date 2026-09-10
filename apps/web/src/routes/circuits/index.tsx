import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * The circuit pages are gone. This path stays as a permanent redirect.
 *
 * They were a template of 23 venue essays plus this index, and about 70% of
 * each one's body text was already published on the race page for the round
 * held there. That measurement is why they were made noindex and pointed their
 * canonical at the race in the first place — see the deleted `circuitPageSeo`
 * and `docs/seo-content-policy.md`. Once the write-ups became the place venue
 * analysis is written, a second set of venue pages nobody was meant to find
 * had no job left: they cost crawl budget, split the site's own linking, and
 * were 23 pages of unfact-checked prose standing behind an editorial review.
 *
 * `/races` rather than a guessed circuit-to-race mapping. Inverting
 * `CIRCUIT_BY_RACE_PREFIX` needs a season to pick the round, so a precise
 * target would be a hand-kept table that rots every winter. The calendar is
 * one hop from every race and every write-up, and it never goes stale. Per-
 * circuit URLs that do have a write-up are retargeted in `$circuitSlug.tsx`.
 */
export const Route = createFileRoute('/circuits/')({
  beforeLoad: () => {
    throw redirect({ to: '/races', statusCode: 301 });
  },
});
