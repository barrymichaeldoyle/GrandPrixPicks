import { bufferCommand } from './news-social.mjs';

const DAY = 24 * 60 * 60_000;

/**
 * Which kind of post this was, from what Buffer kept of it. The classes are
 * the levers the posting rules pull, so the table answers "did it work":
 *
 * - quote      a quote of the source's own post (no card, no link)
 * - results    the app's classification card
 * - standings  the app's drivers' championship card
 * - consensus  the app's "what players picked" card
 * - news card  a news post with the story card as the image
 * - link       the old shape, a URL in the text
 * - text       plain text, no image, no link
 */
export function classify(post) {
  const image =
    post.assets?.find((asset) => asset.source || asset.image)?.source ??
    post.assets?.[0]?.image?.url ??
    post.assets?.[0]?.source ??
    '';
  if (post.metadata?.retweet || post.metadata?.twitter?.retweet) {
    return 'quote';
  }
  for (const kind of ['results', 'standings', 'consensus']) {
    if (image.includes(`/og/${kind}`)) {
      return kind;
    }
  }
  if (image.includes('/og/news')) {
    return 'news card';
  }
  if (/https?:\/\//.test(post.text ?? '')) {
    return 'link';
  }
  return 'text';
}

function metric(post, type) {
  return post.metrics?.find((entry) => entry.type === type)?.value ?? 0;
}

function median(values) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Sent posts on the channel in the window, summed and medianed by class. */
export async function socialStats({
  organizationId,
  channelId,
  days = 30,
  buffer = bufferCommand,
  now = Date.now(),
}) {
  const posts = [];
  let after;
  for (let page = 0; page < 20; page++) {
    const result = await buffer(
      ['posts', 'list'],
      {
        organizationId,
        filter: {
          channelIds: [channelId],
          status: ['sent'],
          dueAt: { start: new Date(now - days * DAY).toISOString() },
        },
        sort: [{ field: 'dueAt', direction: 'desc' }],
      },
      {
        fields:
          'items.{id,text,status,sentAt,metrics,assets,metadata},pageInfo',
        after,
      },
    );
    posts.push(...(result.items ?? []));
    if (!result.pageInfo?.hasNextPage || !result.pageInfo.endCursor) {
      break;
    }
    after = result.pageInfo.endCursor;
  }
  const groups = new Map();
  for (const post of posts) {
    const kind = classify(post);
    const group = groups.get(kind) ?? {
      kind,
      posts: 0,
      impressions: [],
      likes: 0,
      reposts: 0,
      replies: 0,
      clicks: 0,
    };
    group.posts += 1;
    group.impressions.push(metric(post, 'impressions'));
    group.likes += metric(post, 'reactions');
    group.reposts += metric(post, 'reposts');
    group.replies += metric(post, 'comments');
    group.clicks += metric(post, 'clicks');
    groups.set(kind, group);
  }
  const rows = [...groups.values()]
    .map((group) => ({
      kind: group.kind,
      posts: group.posts,
      medianImpressions: median(group.impressions),
      totalImpressions: group.impressions.reduce((a, b) => a + b, 0),
      likes: group.likes,
      reposts: group.reposts,
      replies: group.replies,
      clicks: group.clicks,
    }))
    .sort((a, b) => b.medianImpressions - a.medianImpressions);
  const top = [...posts]
    .sort((a, b) => metric(b, 'impressions') - metric(a, 'impressions'))
    .slice(0, 3)
    .map((post) => ({
      sentAt: post.sentAt,
      kind: classify(post),
      impressions: metric(post, 'impressions'),
      text: (post.text ?? '').replace(/\s+/g, ' ').slice(0, 90),
    }));
  return { days, posts: posts.length, rows, top };
}

export function formatStats(stats) {
  const pad = (value, width) => String(value).padEnd(width);
  const lines = [
    `X, last ${stats.days} days: ${stats.posts} posts sent`,
    `${pad('kind', 11)}${pad('posts', 7)}${pad('median impr', 13)}${pad('total', 8)}${pad('likes', 7)}${pad('reposts', 9)}${pad('replies', 9)}clicks`,
  ];
  for (const row of stats.rows) {
    lines.push(
      `${pad(row.kind, 11)}${pad(row.posts, 7)}${pad(row.medianImpressions, 13)}${pad(row.totalImpressions, 8)}${pad(row.likes, 7)}${pad(row.reposts, 9)}${pad(row.replies, 9)}${row.clicks}`,
    );
  }
  if (stats.top.length) {
    lines.push('top posts:');
    for (const post of stats.top) {
      lines.push(
        `  ${post.impressions} impr · ${post.kind} · ${post.sentAt?.slice(0, 10)} · ${post.text}`,
      );
    }
  }
  return lines.join('\n');
}
