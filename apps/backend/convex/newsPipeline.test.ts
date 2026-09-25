/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('private news pipeline', () => {
  it('keeps a reviewed write-up handoff private with its source and reviewer', async () => {
    const t = convexTest(schema, modules);
    const { proposalId, reviewerId } = await t.run(async (ctx) => {
      const now = Date.now();
      const reviewerId = await ctx.db.insert('users', {
        clerkUserId: 'admin',
        isAdmin: true,
        createdAt: now,
        updatedAt: now,
      });
      const sourceId = await ctx.db.insert('newsSources', {
        name: 'Example',
        feedUrl: 'https://example.com/feed',
        enabled: true,
        pollIntervalMs: 900_000,
        nextPollAt: 0,
      });
      const batchId = await ctx.db.insert('newsBatches', {
        key: 'handoff-batch',
        status: 'submitted',
        attempts: 1,
        createdAt: now,
      });
      const candidateId = await ctx.db.insert('newsCandidates', {
        sourceId,
        externalId: 'one',
        canonicalUrl: 'https://example.com/one',
        title: 'Race announcement',
        excerpt: 'An excerpt.',
        foundAt: now,
        status: 'review',
        batchId,
        attempts: 1,
      });
      const proposalId = await ctx.db.insert('newsProposals', {
        candidateId,
        batchId,
        headline: 'Race announcement',
        body: 'The source reported an announcement.',
        category: 'general',
        affectsSessions: [],
        confidence: 'medium',
        reviewReason: 'Check details.',
        status: 'review',
      });
      return { proposalId, reviewerId };
    });
    await expect(
      t.mutation(api.newsPipeline.reviewProposal, {
        proposalId,
        decision: 'handoff',
        raceSlug: 'example-2026',
        handoffNote: 'Check the race write-up.',
      }),
    ).rejects.toThrow(/Admin only/);
    await expect(
      t
        .withIdentity({ subject: 'admin' })
        .mutation(api.newsPipeline.reviewProposal, {
          proposalId,
          decision: 'handoff',
          raceSlug: 'example-2026',
          handoffNote: '<b>unsafe</b>',
        }),
    ).rejects.toThrow(/plain-text/);
    await t
      .withIdentity({ subject: 'admin' })
      .mutation(api.newsPipeline.reviewProposal, {
        proposalId,
        decision: 'handoff',
        raceSlug: 'example-2026',
        handoffNote: 'Check the race write-up.',
      });
    const rows = await t
      .withIdentity({ subject: 'admin' })
      .query(api.newsPipeline.handoffQueue, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      proposal: {
        _id: proposalId,
        status: 'handoff',
        raceSlug: 'example-2026',
        handoffNote: 'Check the race write-up.',
        reviewerId,
      },
      candidate: { canonicalUrl: 'https://example.com/one' },
      source: { name: 'Example' },
    });
    expect(rows[0].proposal.reviewedAt).toBeTypeOf('number');
    await expect(t.query(api.newsPipeline.handoffQueue, {})).rejects.toThrow(
      /Admin only/,
    );
    expect(
      await t.run((ctx) => ctx.db.query('feedEvents').collect()),
    ).toHaveLength(0);
  });
  it('merges a second reviewed source without publishing it', async () => {
    const t = convexTest(schema, modules);
    const { targetId, sourceProposalId } = await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert('users', {
        clerkUserId: 'admin',
        isAdmin: true,
        createdAt: now,
        updatedAt: now,
      });
      const sourceId = await ctx.db.insert('newsSources', {
        name: 'Example',
        feedUrl: 'https://example.com/feed',
        enabled: true,
        pollIntervalMs: 900_000,
        nextPollAt: 0,
      });
      const batchId = await ctx.db.insert('newsBatches', {
        key: 'merge-batch',
        status: 'submitted',
        attempts: 1,
        createdAt: now,
      });
      async function add(suffix: string) {
        const candidateId = await ctx.db.insert('newsCandidates', {
          sourceId,
          externalId: suffix,
          canonicalUrl: `https://example.com/${suffix}`,
          title: `Story ${suffix}`,
          excerpt: 'An excerpt.',
          foundAt: now,
          status: 'review',
          batchId,
          attempts: 1,
        });
        return await ctx.db.insert('newsProposals', {
          candidateId,
          batchId,
          headline: `Story ${suffix}`,
          body: 'The source reported an announcement.',
          category: 'general',
          affectsSessions: [],
          confidence: 'medium',
          reviewReason: 'Check details.',
          status: 'review',
        });
      }
      return { targetId: await add('one'), sourceProposalId: await add('two') };
    });
    await t
      .withIdentity({ subject: 'admin' })
      .mutation(api.newsPipeline.reviewProposal, {
        proposalId: sourceProposalId,
        decision: 'merge',
        mergeIntoId: targetId,
      });
    const rows = await t
      .withIdentity({ subject: 'admin' })
      .query(api.newsPipeline.reviewQueue, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].corroborating).toHaveLength(1);
    expect((await t.run((ctx) => ctx.db.get(sourceProposalId)))?.status).toBe(
      'merged',
    );
    expect(
      await t.run((ctx) => ctx.db.query('feedEvents').collect()),
    ).toHaveLength(0);
  });
  it('suggests known race, driver and round-season team names without forcing a match', async () => {
    const t = convexTest(schema, modules);
    const { sourceId } = await t.run(async (ctx) => {
      const now = Date.now();
      const season = new Date(now).getUTCFullYear();
      const sourceId = await ctx.db.insert('newsSources', {
        name: 'Example',
        feedUrl: 'https://example.com/feed',
        enabled: true,
        pollIntervalMs: 3_600_000,
        nextPollAt: 0,
      });
      const driverId = await ctx.db.insert('drivers', {
        code: 'EXA',
        displayName: 'Alex Example',
        team: 'Example Racing',
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('driverTeamStints', {
        driverId,
        season,
        team: 'Example Racing',
        fromRound: 1,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('races', {
        season,
        round: 1,
        name: 'Example Grand Prix',
        slug: `example-${season}`,
        raceStartAt: now + 86_400_000,
        predictionLockAt: now + 86_400_000,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      return { sourceId };
    });
    await t.mutation(internal.newsPipeline.storeFeed, {
      sourceId,
      items: [
        {
          externalId: 'story',
          canonicalUrl: 'https://example.com/story',
          title: 'Alex Example at the Example Grand Prix',
          excerpt: 'Example Racing made an announcement.',
        },
      ],
    });
    const [candidate] = await t.run((ctx) =>
      ctx.db.query('newsCandidates').collect(),
    );
    expect(candidate).toMatchObject({
      suggestedDriverCodes: ['EXA'],
      suggestedTeams: ['Example Racing'],
    });
    expect(candidate.suggestedRaceSlug).toMatch(/^example-/);
    const source = await t.run((ctx) => ctx.db.get(sourceId));
    expect((source?.nextPollAt ?? 0) - Date.now()).toBeLessThanOrEqual(900_000);
  });
  it('requires an admin reviewer before a race-independent story enters the feed', async () => {
    const t = convexTest(schema, modules);
    const proposalId = await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        clerkUserId: 'admin',
        isAdmin: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const sourceId = await ctx.db.insert('newsSources', {
        name: 'Example',
        feedUrl: 'https://example.com/feed',
        enabled: true,
        pollIntervalMs: 900_000,
        nextPollAt: 0,
      });
      const batchId = await ctx.db.insert('newsBatches', {
        key: 'batch',
        status: 'submitted',
        attempts: 1,
        createdAt: Date.now(),
      });
      const candidateId = await ctx.db.insert('newsCandidates', {
        sourceId,
        externalId: 'one',
        canonicalUrl: 'https://example.com/one',
        title: 'An announcement',
        excerpt: 'Official excerpt.',
        foundAt: Date.now(),
        status: 'review',
        batchId,
        attempts: 1,
      });
      return await ctx.db.insert('newsProposals', {
        candidateId,
        batchId,
        headline: 'An announcement',
        body: 'The organizer made an announcement.',
        category: 'general',
        affectsSessions: [],
        confidence: 'medium',
        reviewReason: 'Confirm official wording.',
        status: 'review',
      });
    });
    await expect(
      t.mutation(api.newsPipeline.reviewProposal, {
        proposalId,
        decision: 'publish',
      }),
    ).rejects.toThrow(/Admin only/);
    await t
      .withIdentity({ subject: 'admin' })
      .mutation(api.newsPipeline.reviewProposal, {
        proposalId,
        decision: 'publish',
        team: 'Cadillac',
      });
    const stories = await t.run((ctx) => ctx.db.query('globalNews').collect());
    expect(stories).toHaveLength(1);
    expect(stories[0].team).toBe('Cadillac');
    const events = await t.run((ctx) => ctx.db.query('feedEvents').collect());
    expect(events).toHaveLength(1);
    expect(events[0].newsTeam).toBe('Cadillac');
  });
  it('rejects unsafe proposals and dead-letters an expired third claim', async () => {
    const t = convexTest(schema, modules);
    const sourceId = await t.run((ctx) =>
      ctx.db.insert('newsSources', {
        name: 'Example',
        feedUrl: 'https://example.com/feed',
        enabled: true,
        pollIntervalMs: 900_000,
        nextPollAt: 0,
      }),
    );
    await t.mutation(internal.newsPipeline.storeFeed, {
      sourceId,
      items: [
        {
          externalId: 'one',
          canonicalUrl: 'https://example.com/one',
          title: 'One story',
          excerpt: 'One excerpt',
        },
      ],
    });
    const batchId = await t.mutation(internal.newsPipeline.queueBatch, {});
    if (!batchId) {
      throw new Error('Expected batch.');
    }
    const first = await t.mutation(internal.newsPipeline.claimBatch, {});
    if (!first) {
      throw new Error('Expected claim.');
    }
    const proposal = {
      candidateId: first.candidates[0]._id,
      headline: 'One story',
      body: 'The source reported this event.',
      category: 'general' as const,
      affectsSessions: [],
      confidence: 'medium' as const,
      reviewReason: 'Verify details.',
    };
    await expect(
      t.mutation(internal.newsPipeline.submitBatch, {
        batchId,
        proposals: [{ ...proposal, body: '<b>unsafe</b>' }],
      }),
    ).rejects.toThrow(/Invalid proposal/);
    await expect(
      t.mutation(internal.newsPipeline.submitBatch, {
        batchId,
        proposals: [{ ...proposal, confidence: 'high' }],
      }),
    ).rejects.toThrow(/High confidence/);
    await expect(
      t.mutation(internal.newsPipeline.submitBatch, {
        batchId,
        proposals: [{ ...proposal, candidateId: sourceId as never }],
      }),
    ).rejects.toThrow(/Expected ID/);
    await t.run((ctx) => ctx.db.patch(batchId, { leaseUntil: Date.now() - 1 }));
    expect(
      (await t.mutation(internal.newsPipeline.claimBatch, {}))?.batchId,
    ).toBe(batchId);
    await t.run((ctx) => ctx.db.patch(batchId, { leaseUntil: Date.now() - 1 }));
    expect(
      (await t.mutation(internal.newsPipeline.claimBatch, {}))?.batchId,
    ).toBe(batchId);
    await t.run((ctx) => ctx.db.patch(batchId, { leaseUntil: Date.now() - 1 }));
    expect(await t.mutation(internal.newsPipeline.claimBatch, {})).toBeNull();
    expect((await t.run((ctx) => ctx.db.get(batchId)))?.status).toBe('dead');
  });
  it('deduplicates tracking URLs and claims a batch once', async () => {
    const t = convexTest(schema, modules);
    const sourceId = await t.run((ctx) =>
      ctx.db.insert('newsSources', {
        name: 'Example',
        feedUrl: 'https://example.com/feed',
        enabled: true,
        pollIntervalMs: 900_000,
        nextPollAt: 0,
      }),
    );
    const item = {
      externalId: 'story-1',
      canonicalUrl: 'https://example.com/a?utm_source=rss',
      title: 'A verified story',
      excerpt: 'Source summary.',
    };
    expect(
      (
        await t.mutation(internal.newsPipeline.storeFeed, {
          sourceId,
          items: [item],
        })
      ).inserted,
    ).toBe(1);
    expect(
      (
        await t.mutation(internal.newsPipeline.storeFeed, {
          sourceId,
          items: [
            {
              ...item,
              externalId: 'story-2',
              canonicalUrl: 'https://example.com/a?utm_source=other',
            },
          ],
        })
      ).inserted,
    ).toBe(0);
    expect(
      (
        await t.mutation(internal.newsPipeline.storeFeed, {
          sourceId,
          items: [
            {
              ...item,
              externalId: 'story-3',
              canonicalUrl: 'https://example.com/different',
            },
          ],
        })
      ).inserted,
    ).toBe(1);
    const batchId = await t.mutation(internal.newsPipeline.queueBatch, {});
    expect(batchId).not.toBeNull();
    const first = await t.mutation(internal.newsPipeline.claimBatch, {});
    expect(first?.candidates).toHaveLength(2);
    expect(await t.mutation(internal.newsPipeline.claimBatch, {})).toBeNull();
    if (!first) {
      throw new Error('Expected a batch.');
    }
    const proposal = {
      candidateId: first.candidates[0]._id,
      headline: 'A verified story',
      body: 'The source reported this development.',
      category: 'general' as const,
      affectsSessions: [],
      confidence: 'medium' as const,
      reviewReason: 'Confirm details.',
      contradictions: ['Two candidate accounts differ on timing.'],
    };
    expect(
      await t.mutation(internal.newsPipeline.submitBatch, {
        batchId: first.batchId,
        proposals: [proposal],
      }),
    ).toEqual({ accepted: true });
    expect(
      await t.mutation(internal.newsPipeline.submitBatch, {
        batchId: first.batchId,
        proposals: [proposal],
      }),
    ).toEqual({ accepted: false });
    const proposals = await t.run((ctx) =>
      ctx.db.query('newsProposals').collect(),
    );
    expect(proposals).toHaveLength(1);
    expect(proposals[0].status).toBe('review');
    expect(proposals[0].contradictions).toEqual([
      'Two candidate accounts differ on timing.',
    ]);
  });
});
