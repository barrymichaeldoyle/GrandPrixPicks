import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { getViewer, requireAdmin } from './lib/auth';
import { canonicalNewsUrl, parseRss, safeHttpUrl } from './lib/newsRss';
import schema from './schema';

const itemValidator = v.object({
  externalId: v.string(),
  canonicalUrl: v.string(),
  title: v.string(),
  excerpt: v.string(),
  sourcePublishedAt: v.optional(v.number()),
});
function contentHash(title: string, excerpt: string): string {
  const normalized = `${title} ${excerpt}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index++) {
    hash = Math.imul(hash ^ normalized.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(16);
}
function normalizedWords(value: string): string {
  return ` ${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}
function mentions(text: string, phrase: string): boolean {
  return normalizedWords(text).includes(normalizedWords(phrase));
}
function isApprovedFeedUrl(raw: string): boolean {
  const url = safeHttpUrl(raw);
  const hosts = (env.NEWS_RSS_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return (
    !!url &&
    url.protocol === 'https:' &&
    !url.port &&
    hosts.includes(url.hostname.toLowerCase())
  );
}

export const configureSource = mutation({
  args: {
    name: v.string(),
    feedUrl: v.string(),
    enabled: v.boolean(),
    pollIntervalMs: v.number(),
  },
  returns: v.id('newsSources'),
  handler: async (ctx, args) => {
    const reviewer = await getViewer(ctx);
    requireAdmin(reviewer);
    const url = safeHttpUrl(args.feedUrl);
    if (
      !url ||
      !isApprovedFeedUrl(args.feedUrl) ||
      args.name.length < 2 ||
      args.name.length > 100 ||
      args.pollIntervalMs < 900_000 ||
      args.pollIntervalMs > 86_400_000
    ) {
      throw new Error('Invalid approved source.');
    }
    const existing = await ctx.db
      .query('newsSources')
      .withIndex('by_feed_url', (q) => q.eq('feedUrl', url.toString()))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        enabled: args.enabled,
        pollIntervalMs: args.pollIntervalMs,
        nextPollAt: Date.now(),
        approvedBy: reviewer?._id,
        approvedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert('newsSources', {
      ...args,
      feedUrl: url.toString(),
      nextPollAt: Date.now(),
      approvedBy: reviewer?._id,
      approvedAt: Date.now(),
    });
  },
});

export const listSources = query({
  args: {},
  returns: v.array(schema.doc('newsSources')),
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));
    return await ctx.db.query('newsSources').take(100);
  },
});

export const dueSources = internalQuery({
  args: { now: v.number() },
  returns: v.array(schema.doc('newsSources')),
  handler: async (ctx, { now }) =>
    await ctx.db
      .query('newsSources')
      .withIndex('by_next_poll', (q) =>
        q.eq('enabled', true).lte('nextPollAt', now),
      )
      .take(5),
});

export const storeFeed = internalMutation({
  args: {
    sourceId: v.id('newsSources'),
    items: v.array(itemValidator),
    error: v.optional(v.string()),
  },
  returns: v.object({ inserted: v.number() }),
  handler: async (ctx, { sourceId, items, error }) => {
    const source = await ctx.db.get(sourceId);
    if (!source) {
      throw new Error('Source not found.');
    }
    const now = Date.now();
    const season = new Date(now).getUTCFullYear();
    const races = items.length
      ? await ctx.db
          .query('races')
          .withIndex('by_season_round', (q) => q.eq('season', season))
          .take(30)
      : [];
    const stints = items.length
      ? await ctx.db
          .query('driverTeamStints')
          .withIndex('by_season', (q) => q.eq('season', season))
          .take(100)
      : [];
    const drivers: Doc<'drivers'>[] = [];
    for (const stint of stints) {
      const driver = await ctx.db.get(stint.driverId);
      if (driver && !drivers.some((row) => row._id === driver._id)) {
        drivers.push(driver);
      }
    }
    const teams = [...new Set(stints.map((stint) => stint.team))];
    let inserted = 0;
    for (const item of items.slice(0, 30)) {
      const canonicalUrl = canonicalNewsUrl(
        item.canonicalUrl,
        new URL(source.feedUrl).hostname,
      );
      if (
        !canonicalUrl ||
        item.title.length > 180 ||
        item.excerpt.length > 500 ||
        item.externalId.length > 500
      ) {
        continue;
      }
      const byId = await ctx.db
        .query('newsCandidates')
        .withIndex('by_source_external', (q) =>
          q.eq('sourceId', sourceId).eq('externalId', item.externalId),
        )
        .unique();
      const byUrl = await ctx.db
        .query('newsCandidates')
        .withIndex('by_url', (q) => q.eq('canonicalUrl', canonicalUrl))
        .first();
      const hash =
        item.excerpt.trim().length >= 60
          ? contentHash(item.title, item.excerpt)
          : undefined;
      const byHash = hash
        ? await ctx.db
            .query('newsCandidates')
            .withIndex('by_source_hash', (q) =>
              q.eq('sourceId', sourceId).eq('contentHash', hash),
            )
            .first()
        : null;
      if (byId || byUrl || byHash) {
        continue;
      }
      await ctx.db.insert('newsCandidates', {
        sourceId,
        externalId: item.externalId,
        contentHash: hash,
        canonicalUrl,
        title: item.title,
        excerpt: item.excerpt,
        suggestedRaceSlug: races.find(
          (race) =>
            mentions(`${item.title} ${item.excerpt}`, race.name) ||
            (race.slug.split('-')[0].length >= 5 &&
              mentions(
                `${item.title} ${item.excerpt}`,
                race.slug.split('-')[0],
              )),
        )?.slug,
        suggestedDriverCodes: drivers
          .filter((driver) =>
            mentions(`${item.title} ${item.excerpt}`, driver.displayName),
          )
          .map((driver) => driver.code)
          .slice(0, 5),
        suggestedTeams: teams
          .filter((team) => mentions(`${item.title} ${item.excerpt}`, team))
          .slice(0, 5),
        sourcePublishedAt:
          item.sourcePublishedAt && item.sourcePublishedAt <= now + 86_400_000
            ? item.sourcePublishedAt
            : undefined,
        foundAt: now,
        status: 'queued',
        attempts: 0,
      });
      inserted++;
    }
    const nearby = await ctx.db
      .query('races')
      .withIndex('by_raceStartAt', (q) =>
        q.gte('raceStartAt', now - 3 * 86_400_000),
      )
      .take(1);
    const interval =
      nearby[0] && nearby[0].raceStartAt <= now + 7 * 86_400_000
        ? Math.max(900_000, Math.floor(source.pollIntervalMs / 4))
        : source.pollIntervalMs;
    await ctx.db.patch(sourceId, {
      nextPollAt: now + interval,
      lastError: error,
    });
    return { inserted };
  },
});

export const pollDue = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const sources = await ctx.runQuery(internal.newsPipeline.dueSources, {
      now: Date.now(),
    });
    for (const source of sources) {
      let items: Array<{
        externalId: string;
        canonicalUrl: string;
        title: string;
        excerpt: string;
        sourcePublishedAt?: number;
      }> = [];
      let error: string | undefined;
      try {
        if (!isApprovedFeedUrl(source.feedUrl)) {
          throw new Error('Feed host is not allowlisted.');
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(source.feedUrl, {
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              Accept:
                'application/rss+xml, application/atom+xml, application/xml',
            },
          });
          if (!response.ok || response.status >= 300 || !response.body) {
            throw new Error(`Feed HTTP ${response.status}`);
          }
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let total = 0;
          while (true) {
            const part = await reader.read();
            if (part.done) {
              break;
            }
            total += part.value.byteLength;
            if (total > 128_000) {
              await reader.cancel();
              throw new Error('Feed exceeds 128 KB.');
            }
            chunks.push(part.value);
          }
          const bytes = new Uint8Array(total);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          items = parseRss(
            new TextDecoder().decode(bytes),
            new URL(source.feedUrl).hostname,
          );
        } finally {
          clearTimeout(timer);
        }
      } catch (cause) {
        error =
          cause instanceof Error ? cause.message.slice(0, 200) : 'Feed failed.';
      }
      await ctx.runMutation(internal.newsPipeline.storeFeed, {
        sourceId: source._id,
        items,
        error,
      });
    }
    return null;
  },
});

export const queueBatch = internalMutation({
  args: {},
  returns: v.union(v.id('newsBatches'), v.null()),
  handler: async (ctx) => {
    const candidates = await ctx.db
      .query('newsCandidates')
      .withIndex('by_status', (q) => q.eq('status', 'queued'))
      .take(5);
    if (!candidates.length) {
      return null;
    }
    const now = Date.now();
    const batchId = await ctx.db.insert('newsBatches', {
      key: `news-${candidates[0]._id}`,
      status: 'queued',
      attempts: 0,
      createdAt: now,
    });
    for (const candidate of candidates) {
      await ctx.db.patch(candidate._id, { batchId, status: 'claimed' });
    }
    return batchId;
  },
});

export const reviewQueue = query({
  args: {},
  returns: v.array(
    v.object({
      proposal: schema.doc('newsProposals'),
      candidate: schema.doc('newsCandidates'),
      source: schema.doc('newsSources'),
      corroborating: v.array(
        v.object({
          candidate: schema.doc('newsCandidates'),
          source: schema.doc('newsSources'),
        }),
      ),
    }),
  ),
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));
    const proposals = await ctx.db
      .query('newsProposals')
      .withIndex('by_status', (q) => q.eq('status', 'review'))
      .take(50);
    const rows = [];
    for (const proposal of proposals) {
      const candidate = await ctx.db.get(proposal.candidateId);
      if (!candidate) {
        continue;
      }
      const source = await ctx.db.get(candidate.sourceId);
      if (source) {
        const corroborating = [];
        for (const candidateId of (
          proposal.corroboratingCandidateIds ?? []
        ).slice(0, 4)) {
          const other = await ctx.db.get(candidateId);
          const otherSource = other ? await ctx.db.get(other.sourceId) : null;
          if (other && otherSource) {
            corroborating.push({ candidate: other, source: otherSource });
          }
        }
        rows.push({ proposal, candidate, source, corroborating });
      }
    }
    return rows;
  },
});

export const handoffQueue = query({
  args: {},
  returns: v.array(
    v.object({
      proposal: schema.doc('newsProposals'),
      candidate: schema.doc('newsCandidates'),
      source: schema.doc('newsSources'),
    }),
  ),
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));
    const proposals = await ctx.db
      .query('newsProposals')
      .withIndex('by_status', (q) => q.eq('status', 'handoff'))
      .take(50);
    const rows = [];
    for (const proposal of proposals) {
      const candidate = await ctx.db.get(proposal.candidateId);
      const source = candidate ? await ctx.db.get(candidate.sourceId) : null;
      if (candidate && source) {
        rows.push({ proposal, candidate, source });
      }
    }
    return rows;
  },
});

const proposalInput = v.object({
  candidateId: v.id('newsCandidates'),
  headline: v.string(),
  body: v.string(),
  category: v.union(v.literal('pick_related'), v.literal('general')),
  raceSlug: v.optional(v.string()),
  affectsSessions: v.array(
    v.union(
      v.literal('quali'),
      v.literal('sprint_quali'),
      v.literal('sprint'),
      v.literal('race'),
    ),
  ),
  confidence: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  contradictions: v.optional(v.array(v.string())),
  reviewReason: v.string(),
});

export const claimBatch = internalMutation({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      batchId: v.id('newsBatches'),
      candidates: v.array(schema.doc('newsCandidates')),
    }),
  ),
  handler: async (ctx) => {
    const now = Date.now();
    const queued = await ctx.db
      .query('newsBatches')
      .withIndex('by_status', (q) => q.eq('status', 'queued'))
      .take(1);
    const expired = queued.length
      ? []
      : await ctx.db
          .query('newsBatches')
          .withIndex('by_status', (q) => q.eq('status', 'claimed'))
          .take(20);
    for (const row of expired) {
      if ((row.leaseUntil ?? 0) < now && row.attempts >= 3) {
        await ctx.db.patch(row._id, { status: 'dead' });
        const candidates = await ctx.db
          .query('newsCandidates')
          .withIndex('by_batch', (q) => q.eq('batchId', row._id))
          .take(5);
        for (const candidate of candidates) {
          await ctx.db.patch(candidate._id, { status: 'dead' });
        }
      }
    }
    const batch =
      queued[0] ??
      expired.find((row) => (row.leaseUntil ?? 0) < now && row.attempts < 3);
    if (!batch) {
      return null;
    }
    const candidates = await ctx.db
      .query('newsCandidates')
      .withIndex('by_batch', (q) => q.eq('batchId', batch._id))
      .take(5);
    await ctx.db.patch(batch._id, {
      status: 'claimed',
      attempts: batch.attempts + 1,
      leaseUntil: now + 15 * 60_000,
    });
    return { batchId: batch._id, candidates };
  },
});

export const submitBatch = internalMutation({
  args: { batchId: v.id('newsBatches'), proposals: v.array(proposalInput) },
  returns: v.object({ accepted: v.boolean() }),
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) {
      throw new Error('Batch not found.');
    }
    if (batch.status === 'submitted') {
      return { accepted: false };
    }
    if (batch.status !== 'claimed' || (batch.leaseUntil ?? 0) <= Date.now()) {
      throw new Error('Claim expired.');
    }
    const candidates = await ctx.db
      .query('newsCandidates')
      .withIndex('by_batch', (q) => q.eq('batchId', batch._id))
      .take(5);
    const allowed = new Set(candidates.map((row) => row._id));
    if (
      args.proposals.length > 5 ||
      new Set(args.proposals.map((row) => row.candidateId)).size !==
        args.proposals.length
    ) {
      throw new Error('Invalid proposal set.');
    }
    for (const proposal of args.proposals) {
      if (
        !allowed.has(proposal.candidateId) ||
        proposal.headline.length < 3 ||
        proposal.headline.length > 180 ||
        proposal.body.length < 10 ||
        proposal.body.length > 1000 ||
        proposal.reviewReason.length > 500 ||
        /<[^>]*>|&lt;|&#\d+;/i.test(
          `${proposal.headline} ${proposal.body} ${proposal.reviewReason}`,
        )
      ) {
        throw new Error('Invalid proposal.');
      }
      if (
        proposal.confidence === 'high' ||
        (proposal.contradictions?.length ?? 0) > 5 ||
        proposal.contradictions?.some(
          (text) => text.length > 300 || /<[^>]*>|&lt;|&#\d+;/i.test(text),
        )
      ) {
        throw new Error(
          'High confidence requires corroboration; contradictions must be short plain text.',
        );
      }
      if (
        (proposal.category === 'general' && proposal.affectsSessions.length) ||
        (proposal.category === 'pick_related' &&
          !proposal.affectsSessions.length)
      ) {
        throw new Error('Invalid category and sessions.');
      }
      if (proposal.raceSlug && !/^[a-z0-9-]{3,100}$/.test(proposal.raceSlug)) {
        throw new Error('Invalid race slug.');
      }
    }
    for (const proposal of args.proposals) {
      await ctx.db.insert('newsProposals', {
        ...proposal,
        batchId: batch._id,
        status: 'review',
      });
      await ctx.db.patch(proposal.candidateId, { status: 'review' });
    }
    for (const candidate of candidates) {
      if (!args.proposals.some((row) => row.candidateId === candidate._id)) {
        await ctx.db.patch(candidate._id, { status: 'rejected' });
      }
    }
    await ctx.db.patch(batch._id, { status: 'submitted' });
    return { accepted: true };
  },
});

export const failBatch = internalMutation({
  args: { batchId: v.id('newsBatches') },
  returns: v.null(),
  handler: async (ctx, { batchId }) => {
    const batch = await ctx.db.get(batchId);
    if (!batch || batch.status !== 'claimed') {
      return null;
    }
    const dead = batch.attempts >= 3;
    await ctx.db.patch(batchId, {
      status: dead ? 'dead' : 'queued',
      leaseUntil: undefined,
    });
    if (dead) {
      const candidates = await ctx.db
        .query('newsCandidates')
        .withIndex('by_batch', (q) => q.eq('batchId', batchId))
        .take(5);
      for (const candidate of candidates) {
        await ctx.db.patch(candidate._id, { status: 'dead' });
      }
    }
    return null;
  },
});

export const reviewProposal = mutation({
  args: {
    proposalId: v.id('newsProposals'),
    decision: v.union(
      v.literal('reject'),
      v.literal('publish'),
      v.literal('merge'),
      v.literal('handoff'),
    ),
    mergeIntoId: v.optional(v.id('newsProposals')),
    handoffNote: v.optional(v.string()),
    headline: v.optional(v.string()),
    body: v.optional(v.string()),
    team: v.optional(v.string()),
    raceSlug: v.optional(v.string()),
    feedSelected: v.optional(v.boolean()),
    writeUpSelected: v.optional(v.boolean()),
    category: v.optional(
      v.union(v.literal('pick_related'), v.literal('general')),
    ),
    affectsSessions: v.optional(
      v.array(
        v.union(
          v.literal('quali'),
          v.literal('sprint_quali'),
          v.literal('sprint'),
          v.literal('race'),
        ),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reviewer = await getViewer(ctx);
    requireAdmin(reviewer);
    if (!reviewer) {
      throw new Error('Admin only');
    }
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal || proposal.status !== 'review') {
      throw new Error('Proposal is no longer in review.');
    }
    const candidate = await ctx.db.get(proposal.candidateId);
    if (!candidate) {
      throw new Error('Candidate not found.');
    }
    if (args.decision === 'merge') {
      if (!args.mergeIntoId || args.mergeIntoId === proposal._id) {
        throw new Error('Choose another proposal to merge into.');
      }
      const target = await ctx.db.get(args.mergeIntoId);
      if (
        !target ||
        target.status !== 'review' ||
        target.category !== proposal.category
      ) {
        throw new Error(
          'Merge target must be an open proposal in the same category.',
        );
      }
      const corroborating = target.corroboratingCandidateIds ?? [];
      if (
        corroborating.includes(candidate._id) ||
        target.candidateId === candidate._id ||
        corroborating.length >= 4
      ) {
        throw new Error('Source already attached or merge limit reached.');
      }
      await ctx.db.patch(target._id, {
        corroboratingCandidateIds: [...corroborating, candidate._id],
      });
      await ctx.db.patch(proposal._id, {
        status: 'merged',
        mergedIntoId: target._id,
        reviewerId: reviewer._id,
        reviewedAt: Date.now(),
      });
      return null;
    }
    if (args.decision === 'handoff') {
      const raceSlug = args.raceSlug ?? proposal.raceSlug;
      const note = args.handoffNote?.trim();
      if (
        !raceSlug ||
        !/^[a-z0-9-]{3,100}$/.test(raceSlug) ||
        !note ||
        note.length > 500 ||
        /<[^>]*>|&lt;|&#\d+;/i.test(note)
      ) {
        throw new Error('A weekend and plain-text handoff note are required.');
      }
      await ctx.db.patch(proposal._id, {
        status: 'handoff',
        raceSlug,
        handoffNote: note,
        reviewerId: reviewer._id,
        reviewedAt: Date.now(),
      });
      return null;
    }
    if (args.decision === 'reject') {
      await ctx.db.patch(proposal._id, {
        status: 'rejected',
        reviewerId: reviewer._id,
        reviewedAt: Date.now(),
      });
      await ctx.db.patch(candidate._id, { status: 'rejected' });
      return null;
    }
    const source = await ctx.db.get(candidate.sourceId);
    if (!source) {
      throw new Error('Source not found.');
    }
    const category = args.category ?? proposal.category;
    const affectsSessions = args.affectsSessions ?? proposal.affectsSessions;
    const raceSlug = args.raceSlug ?? proposal.raceSlug;
    const headline = args.headline ?? proposal.headline;
    const body = args.body ?? proposal.body;
    if (
      headline.length < 3 ||
      headline.length > 180 ||
      body.length < 10 ||
      body.length > 1000 ||
      /<[^>]*>|&lt;|&#\d+;/i.test(`${headline} ${body}`)
    ) {
      throw new Error('Invalid copy.');
    }
    const key = `candidate-${candidate._id}`;
    let publishedNewsId;
    let publishedGlobalId;
    if (raceSlug) {
      await ctx.runMutation(internal.raceNews.publish, {
        raceSlug,
        key,
        headline,
        body,
        category,
        affectsSessions,
        feedSelected: args.feedSelected,
        writeUpSelected: args.writeUpSelected,
        sourceName: source.name,
        sourceUrl: candidate.canonicalUrl,
        sourcePublishedAt: candidate.sourcePublishedAt,
      });
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', raceSlug))
        .unique();
      publishedNewsId = race
        ? (
            await ctx.db
              .query('raceNews')
              .withIndex('by_race_key', (q) =>
                q.eq('raceId', race._id).eq('key', key),
              )
              .unique()
          )?._id
        : undefined;
    } else {
      if (category !== 'general' || affectsSessions.length) {
        throw new Error('Pick-related news requires a weekend.');
      }
      publishedGlobalId = await ctx.runMutation(internal.globalNews.publish, {
        key,
        headline,
        body,
        team: args.team,
        sourceName: source.name,
        sourceUrl: candidate.canonicalUrl,
        sourcePublishedAt: candidate.sourcePublishedAt,
      });
    }
    await ctx.db.patch(proposal._id, {
      status: 'published',
      headline,
      body,
      category,
      raceSlug,
      affectsSessions,
      reviewerId: reviewer._id,
      reviewedAt: Date.now(),
      publishedNewsId,
      publishedGlobalId,
    });
    await ctx.db.patch(candidate._id, { status: 'published' });
    return null;
  },
});
