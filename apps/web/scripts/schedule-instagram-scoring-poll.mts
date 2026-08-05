import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUFFER_API_URL = 'https://api.buffer.com';
const DUE_AT = '2026-08-06T10:30:00.000Z';
const POST_TEXT = 'Instagram Story poll: which prediction is harder?';
const DEFAULT_ASSET_URL =
  'https://scoring-poll-2026-08-06.gpp-social-assets-2026.pages.dev/01-scoring-poll.png';
const STORY_INSTRUCTIONS =
  'Add the Instagram Poll sticker in the open area below the two cards. Question: Which is harder to predict? Choices: Exact Top 5 / Team-mate calls. Add a Link sticker below it labelled Make your picks linking to https://grandprixpicks.com/ig. Publish, then add this Story to the How to play Highlight.';

type BufferOrganization = { id: string; name: string };
type BufferChannel = {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  externalLink: string | null;
  isDisconnected: boolean;
  isLocked: boolean;
  hasActiveMemberDevice: boolean;
};
type ScheduledPost = {
  id: string;
  text: string;
  dueAt: string | null;
  status: string;
  channelId: string;
  assets: Array<{
    source: string;
    mimeType: string;
    image?: { altText: string; width: number; height: number };
  }>;
  metadata: {
    type: string;
    shouldShareToFeed: boolean;
    stickerFields: { other: string | null; text: string | null } | null;
  } | null;
};

const apiKey = process.env.BUFFER_API_KEY;
if (!apiKey) throw new Error('BUFFER_API_KEY is missing.');
const apply = process.argv.includes('--apply');
const assetUrl = process.env.BUFFER_SCORING_POLL_ASSET_URL ?? DEFAULT_ASSET_URL;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const receiptPath = path.join(
  repoRoot,
  'artifacts/social/instagram-launch-2026/buffer-scoring-poll-story.json',
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
          hasActiveMemberDevice
        }
      }`,
      { organizationId: organization.id },
    );
    for (const channel of result.channels) {
      if (
        channel.service === 'instagram' &&
        !channel.isDisconnected &&
        !channel.isLocked
      ) {
        candidates.push({ organization, channel });
      }
    }
  }
  if (candidates.length !== 1) {
    throw new Error(
      `Expected exactly one connected Instagram channel; found ${candidates.length}.`,
    );
  }
  return candidates[0]!;
}

const postFields = `
  id text dueAt status channelId
  assets {
    source mimeType
    ... on ImageAsset { image { altText width height } }
  }
  metadata {
    ... on InstagramPostMetadata {
      type shouldShareToFeed
      stickerFields { other text }
    }
  }
`;

async function getScheduledPosts(
  organizationId: string,
  channelId: string,
): Promise<ScheduledPost[]> {
  const result = await bufferRequest<{
    posts: { edges: Array<{ node: ScheduledPost }> };
  }>(
    `query GetScheduledScoringPoll(
      $organizationId: OrganizationId!
      $channelId: ChannelId!
    ) {
      posts(
        first: 100
        input: {
          organizationId: $organizationId
          filter: { status: [scheduled, draft], channelIds: [$channelId] }
          sort: [{ field: dueAt, direction: asc }]
        }
      ) {
        edges { node { ${postFields} } }
      }
    }`,
    { organizationId, channelId },
  );
  return result.posts.edges.map(({ node }) => node);
}

function verifyPost(post: ScheduledPost): void {
  if (post.dueAt !== DUE_AT) {
    throw new Error(`Story dueAt mismatch: ${post.dueAt} != ${DUE_AT}`);
  }
  if (post.metadata?.type !== 'story') {
    throw new Error('Scheduled content is not an Instagram Story.');
  }
  if (post.metadata.stickerFields?.other !== STORY_INSTRUCTIONS) {
    throw new Error('Story sticker instructions did not persist.');
  }
  if (post.assets.length !== 1) {
    throw new Error(`Expected one Story asset; found ${post.assets.length}.`);
  }
}

async function createPost(channelId: string): Promise<ScheduledPost> {
  const result = await bufferRequest<{
    createPost:
      | { post: ScheduledPost; message?: never }
      | { post?: never; message: string };
  }>(
    `mutation CreateInstagramScoringPoll($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { ${postFields} } }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        text: POST_TEXT,
        channelId,
        schedulingType: 'notification',
        mode: 'customScheduled',
        dueAt: DUE_AT,
        assets: [
          {
            image: {
              url: assetUrl,
              metadata: {
                altText:
                  'Grand Prix Picks Story comparing Top 5 predictions with team-mate head-to-head calls and inviting viewers to vote on which is harder.',
              },
            },
          },
        ],
        metadata: {
          instagram: {
            type: 'story',
            shouldShareToFeed: false,
            isAiGenerated: false,
            stickerFields: { other: STORY_INSTRUCTIONS },
          },
        },
      },
    },
  );
  if (!result.createPost.post) {
    throw new Error(`Buffer rejected the Story: ${result.createPost.message}`);
  }
  return result.createPost.post;
}

async function main(): Promise<void> {
  const response = await fetch(assetUrl, { method: 'HEAD' });
  if (!response.ok || response.headers.get('content-type') !== 'image/png') {
    throw new Error(
      `Story asset is not publicly available: ${response.status} ${response.headers.get('content-type')}`,
    );
  }

  const { organization, channel } = await resolveTarget();
  const posts = await getScheduledPosts(organization.id, channel.id);
  const existing = posts.find((post) => post.text === POST_TEXT);
  console.log(
    `Target: ${channel.displayName ?? channel.name} (${channel.externalLink ?? channel.id})`,
  );
  console.log(
    `${existing ? 'Existing' : apply ? 'Scheduling' : 'Would schedule'} scoring poll Story for ${DUE_AT}`,
  );
  if (!apply) {
    console.log('Dry run only. Pass --apply to schedule the Story.');
    return;
  }

  const scheduled = existing ?? (await createPost(channel.id));
  verifyPost(scheduled);
  const after = await getScheduledPosts(organization.id, channel.id);
  const confirmed = after.find((post) => post.id === scheduled.id);
  if (!confirmed) throw new Error('Story was not found after scheduling.');
  verifyPost(confirmed);

  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        organization,
        channel,
        deviceTestConfirmedByUser: true,
        bufferPostId: confirmed.id,
        dueAt: confirmed.dueAt,
        status: confirmed.status,
        assetUrl,
        storyInstructionsVerified:
          confirmed.metadata?.stickerFields?.other === STORY_INSTRUCTIONS,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Verified scheduled Story ${confirmed.id} at ${confirmed.dueAt}.`,
  );
  console.log(`Wrote receipt to ${receiptPath}`);
}

await main();
