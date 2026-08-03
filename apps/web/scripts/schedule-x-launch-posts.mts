import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUFFER_API_URL = 'https://api.buffer.com';
const DEFAULT_ASSET_BASE_URL =
  'https://grandprixpicks.com/social/x-launch-2026';

type BufferOrganization = { id: string; name: string };
type BufferChannel = {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  externalLink: string | null;
  isDisconnected: boolean;
  isLocked: boolean;
};
type ScheduledPost = {
  id: string;
  text: string;
  dueAt: string | null;
  status: string;
  channelId: string;
  assets: Array<{ source: string; mimeType: string }>;
};
type LaunchPost = {
  key: string;
  filename: string;
  dueAt: string;
  text: string;
  reply: string;
  altText: string;
};

const posts: LaunchPost[] = [
  {
    key: 'what-is-grand-prix-picks',
    filename: '01-what-is-grand-prix-picks.png',
    dueAt: '2026-08-05T16:30:00.000Z',
    text: `Predict the Top 5. Call every team-mate battle.

Compete on the global leaderboard or create a private league with your friends.

Free F1 predictions across qualifying, sprints and races.`,
    reply: `Make your picks before the next session starts:

https://grandprixpicks.com`,
    altText:
      'Grand Prix Picks graphic introducing a free F1 prediction game. A completed Top 5 prediction ranks Lando Norris, Charles Leclerc, Kimi Antonelli, Oscar Piastri and Lewis Hamilton with their nationality flags, driver numbers and team colours. Beneath it, a McLaren team-mate head-to-head shows Lando Norris selected over Oscar Piastri. Text explains that players make both calls for qualifying, sprints and races.',
  },
  {
    key: 'how-scoring-works',
    filename: '02-how-scoring-works.png',
    dueAt: '2026-08-10T16:30:00.000Z',
    text: `One position out should not make your prediction worthless.

An exact Top 5 prediction earns 5 points. One place away earns 3. A driver who still finishes inside the Top 5 earns 1.

Close still counts.`,
    reply: `Every Top 5 pick scores independently. Team-mate calls add another point when you pick the driver who finishes ahead.

Play free at https://grandprixpicks.com`,
    altText:
      'Grand Prix Picks scoring graphic headed “Close still counts.” Three panels use F1 timing colours to explain the Top 5 scoring system: purple for 5 points when the driver finishes in the exact predicted position, green for 3 points when the prediction is one place away, and yellow for 1 point when the driver finishes elsewhere inside the actual Top 5.',
  },
  {
    key: 'global-private-leagues',
    filename: '03-global-private-leagues.png',
    dueAt: '2026-08-15T16:30:00.000Z',
    text: `The global leaderboard shows how good you are.

Your private league decides whether your friends ever hear the end of it.`,
    reply: `One set of picks counts in both. Create a league, share one invite link and compete across every qualifying session, sprint and race.

https://grandprixpicks.com`,
    altText:
      'Grand Prix Picks graphic headed “One score. Two tables.” A score of 455 branches into a global leaderboard and a private league table. The current player is highlighted on 455 points in 12th place globally and first place in the private league, showing that the same saved predictions count in both tables.',
  },
];

const apiKey = process.env.BUFFER_API_KEY;
if (!apiKey) {
  throw new Error('BUFFER_API_KEY is missing.');
}

const apply = process.argv.includes('--apply');
const assetBaseUrl = (
  process.env.BUFFER_ASSET_BASE_URL ?? DEFAULT_ASSET_BASE_URL
).replace(/\/$/, '');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const receiptPath = path.join(
  repoRoot,
  'artifacts/social/x-launch-2026/buffer-schedule.json',
);

async function bufferRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(BUFFER_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (!response.ok || body.errors || !body.data) {
    throw new Error(
      `Buffer API request failed: ${JSON.stringify(body.errors ?? body)}`,
    );
  }
  return body.data;
}

async function resolveTarget(): Promise<{
  organization: BufferOrganization;
  channel: BufferChannel;
}> {
  const account = await bufferRequest<{
    account: { organizations: BufferOrganization[] };
  }>(`query GetOrganizations {
    account { organizations { id name } }
  }`);
  const candidates: Array<{
    organization: BufferOrganization;
    channel: BufferChannel;
  }> = [];
  for (const organization of account.account.organizations) {
    const result = await bufferRequest<{ channels: BufferChannel[] }>(
      `query GetChannels($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId }) {
          id name displayName service externalLink isDisconnected isLocked
        }
      }`,
      { organizationId: organization.id },
    );
    for (const channel of result.channels) {
      if (
        channel.service === 'twitter' &&
        !channel.isDisconnected &&
        !channel.isLocked
      ) {
        candidates.push({ organization, channel });
      }
    }
  }
  if (candidates.length !== 1) {
    throw new Error(
      `Expected exactly one connected, unlocked X channel; found ${candidates.length}.`,
    );
  }
  return candidates[0]!;
}

async function getScheduledPosts(
  organizationId: string,
  channelId: string,
): Promise<ScheduledPost[]> {
  const result = await bufferRequest<{
    posts: { edges: Array<{ node: ScheduledPost }> };
  }>(
    `query GetScheduledPosts(
      $organizationId: OrganizationId!
      $channelId: ChannelId!
    ) {
      posts(
        first: 100
        input: {
          organizationId: $organizationId
          filter: { status: [scheduled], channelIds: [$channelId] }
          sort: [{ field: dueAt, direction: asc }]
        }
      ) {
        edges {
          node { id text dueAt status channelId assets { source mimeType } }
        }
      }
    }`,
    { organizationId, channelId },
  );
  return result.posts.edges.map(({ node }) => node);
}

function imageUrl(post: LaunchPost): string {
  return `${assetBaseUrl}/${post.filename}`;
}

async function verifyAssets(): Promise<void> {
  for (const post of posts) {
    const response = await fetch(imageUrl(post), { method: 'HEAD' });
    if (!response.ok || response.headers.get('content-type') !== 'image/png') {
      throw new Error(
        `Invalid hosted image for ${post.key}: ${response.status} ${response.headers.get('content-type')} ${imageUrl(post)}`,
      );
    }
  }
}

async function createScheduledThread(
  post: LaunchPost,
  channelId: string,
): Promise<ScheduledPost> {
  const imageAsset = {
    image: {
      url: imageUrl(post),
      metadata: { altText: post.altText },
    },
  };
  const result = await bufferRequest<{
    createPost:
      | { post: ScheduledPost; message?: never }
      | { post?: never; message: string };
  }>(
    `mutation CreateScheduledThread($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id text dueAt status channelId assets { source mimeType } }
        }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        text: post.text,
        channelId,
        schedulingType: 'automatic',
        mode: 'customScheduled',
        dueAt: post.dueAt,
        assets: [],
        metadata: {
          twitter: {
            isAiGenerated: false,
            thread: [
              { text: post.text, assets: [imageAsset] },
              { text: post.reply, assets: [] },
            ],
          },
        },
      },
    },
  );
  if (!result.createPost.post) {
    throw new Error(
      `Buffer rejected ${post.key}: ${result.createPost.message}`,
    );
  }
  return result.createPost.post;
}

async function main(): Promise<void> {
  const { organization, channel } = await resolveTarget();
  const scheduled = await getScheduledPosts(organization.id, channel.id);
  const existingByCopy = new Map(scheduled.map((post) => [post.text, post]));

  console.log(
    `Target: ${channel.displayName ?? channel.name} (${channel.externalLink ?? channel.id})`,
  );
  for (const post of posts) {
    const existing = existingByCopy.get(post.text);
    console.log(
      `${existing ? 'Existing' : apply ? 'Scheduling' : 'Would schedule'} ${post.key} for ${post.dueAt}`,
    );
  }
  if (!apply) {
    console.log('Dry run only. Pass --apply to schedule missing posts.');
    return;
  }

  await verifyAssets();
  const receiptPosts: Array<{
    key: string;
    bufferPostId: string;
    dueAt: string;
    imageUrl: string;
  }> = [];
  for (const post of posts) {
    const existing = existingByCopy.get(post.text);
    const scheduledPost =
      existing ?? (await createScheduledThread(post, channel.id));
    if (scheduledPost.dueAt !== post.dueAt) {
      throw new Error(
        `${post.key} dueAt mismatch: ${scheduledPost.dueAt} != ${post.dueAt}`,
      );
    }
    receiptPosts.push({
      key: post.key,
      bufferPostId: scheduledPost.id,
      dueAt: post.dueAt,
      imageUrl: imageUrl(post),
    });
  }

  const after = await getScheduledPosts(organization.id, channel.id);
  const confirmedCopies = new Set(after.map((post) => post.text));
  for (const post of posts) {
    if (!confirmedCopies.has(post.text)) {
      throw new Error(`${post.key} was not found in Buffer after scheduling.`);
    }
  }
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        organization,
        channel,
        assetBaseUrl,
        posts: receiptPosts,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Verified ${posts.length} X launch posts in Buffer.`);
  console.log(`Wrote receipt to ${receiptPath}`);
}

await main();
