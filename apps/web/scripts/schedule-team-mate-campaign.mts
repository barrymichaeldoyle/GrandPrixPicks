import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUFFER_API_URL = 'https://api.buffer.com';
const DEFAULT_ASSET_BASE_URL =
  'https://582c3ffe.grand-prix-picks.pages.dev/social/summer-break-team-mate-h2h-2026';

type CampaignPost = {
  sequence: number;
  scheduledDate: string;
  scheduledTime: string;
  timeZone: string;
  team: string;
  image: string;
  altText: string;
  xCopy: string;
  xReply: string;
};

type Manifest = {
  campaignDate: string;
  posts: CampaignPost[];
};

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

type Receipt = {
  generatedAt: string;
  organization: BufferOrganization;
  channel: BufferChannel;
  assetBaseUrl: string;
  posts: Array<{
    sequence: number;
    team: string;
    bufferPostId: string;
    status: 'scheduled' | 'draft';
    dueAt: string | null;
    imageUrl: string;
  }>;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const campaignDir = path.join(
  repoRoot,
  'artifacts/social/summer-break-team-mate-h2h-2026',
);
const manifestPath = path.join(campaignDir, 'manifest.json');
const receiptPath = path.join(campaignDir, 'buffer-schedule.json');

const apiKey = process.env.BUFFER_API_KEY;
if (!apiKey) {
  throw new Error('BUFFER_API_KEY is missing.');
}

const apply = process.argv.includes('--apply');
const activateDrafts = process.argv.includes('--activate-drafts');
const inspectOnly = process.argv.includes('--inspect');
const assetBaseUrl = (
  process.env.BUFFER_ASSET_BASE_URL ?? DEFAULT_ASSET_BASE_URL
).replace(/\/$/, '');

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

function dueAt(post: CampaignPost): string {
  if (
    post.timeZone !== 'Africa/Johannesburg' ||
    post.scheduledTime !== '10:00'
  ) {
    throw new Error(
      `Unexpected schedule for ${post.team}: ${post.scheduledTime} ${post.timeZone}`,
    );
  }
  return new Date(`${post.scheduledDate}T10:00:00+02:00`).toISOString();
}

function imageUrl(post: CampaignPost): string {
  return `${assetBaseUrl}/${path.basename(post.image)}`;
}

async function verifyAssets(posts: CampaignPost[]): Promise<void> {
  for (const post of posts) {
    const url = imageUrl(post);
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok || response.headers.get('content-type') !== 'image/png') {
      throw new Error(
        `Invalid hosted image for ${post.team}: ${response.status} ${response.headers.get('content-type')} ${url}`,
      );
    }
  }
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

async function getDraftPosts(
  organizationId: string,
  channelId: string,
): Promise<ScheduledPost[]> {
  const result = await bufferRequest<{
    posts: { edges: Array<{ node: ScheduledPost }> };
  }>(
    `query GetDraftPosts(
      $organizationId: OrganizationId!
      $channelId: ChannelId!
    ) {
      posts(
        first: 100
        input: {
          organizationId: $organizationId
          filter: { status: [draft], channelIds: [$channelId] }
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

async function createScheduledThread(
  post: CampaignPost,
  channelId: string,
): Promise<ScheduledPost> {
  const url = imageUrl(post);
  const imageAsset = {
    image: {
      url,
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
        text: post.xCopy,
        channelId,
        schedulingType: 'automatic',
        mode: 'customScheduled',
        dueAt: dueAt(post),
        assets: [],
        metadata: {
          twitter: {
            isAiGenerated: false,
            thread: [
              { text: post.xCopy, assets: [imageAsset] },
              { text: post.xReply, assets: [] },
            ],
          },
        },
      },
    },
  );
  if (!result.createPost.post) {
    throw new Error(
      `Buffer rejected ${post.team}: ${result.createPost.message}`,
    );
  }
  return result.createPost.post;
}

async function createDraftThread(
  post: CampaignPost,
  channelId: string,
): Promise<ScheduledPost> {
  const url = imageUrl(post);
  const imageAsset = {
    image: {
      url,
      metadata: { altText: post.altText },
    },
  };
  const result = await bufferRequest<{
    createPost:
      | { post: ScheduledPost; message?: never }
      | { post?: never; message: string };
  }>(
    `mutation CreateDraftThread($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id text dueAt status channelId assets { source mimeType } }
        }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        text: post.xCopy,
        channelId,
        schedulingType: 'automatic',
        mode: 'addToQueue',
        saveToDraft: true,
        assets: [],
        metadata: {
          twitter: {
            isAiGenerated: false,
            thread: [
              { text: post.xCopy, assets: [imageAsset] },
              { text: post.xReply, assets: [] },
            ],
          },
        },
      },
    },
  );
  if (!result.createPost.post) {
    throw new Error(
      `Buffer rejected ${post.team} draft: ${result.createPost.message}`,
    );
  }
  return result.createPost.post;
}

async function scheduleDraftThread(
  post: CampaignPost,
  bufferPostId: string,
): Promise<ScheduledPost> {
  const imageAsset = {
    image: {
      url: imageUrl(post),
      metadata: { altText: post.altText },
    },
  };
  const result = await bufferRequest<{
    editPost:
      | { post: ScheduledPost; message?: never }
      | { post?: never; message: string };
  }>(
    `mutation ScheduleDraftThread($input: EditPostInput!) {
      editPost(input: $input) {
        ... on PostActionSuccess {
          post { id text dueAt status channelId assets { source mimeType } }
        }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        id: bufferPostId,
        text: post.xCopy,
        schedulingType: 'automatic',
        mode: 'customScheduled',
        dueAt: dueAt(post),
        saveToDraft: false,
        assets: [],
        metadata: {
          twitter: {
            isAiGenerated: false,
            thread: [
              { text: post.xCopy, assets: [imageAsset] },
              { text: post.xReply, assets: [] },
            ],
          },
        },
      },
    },
  );
  if (!result.editPost.post) {
    throw new Error(
      `Buffer rejected scheduling the ${post.team} draft: ${result.editPost.message}`,
    );
  }
  return result.editPost.post;
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  if (manifest.posts.length !== 11) {
    throw new Error(
      `Expected 11 campaign posts, found ${manifest.posts.length}.`,
    );
  }
  if (inspectOnly) {
    const { organization, channel } = await resolveTarget();
    const scheduled = await getScheduledPosts(organization.id, channel.id);
    const drafts = await getDraftPosts(organization.id, channel.id);
    console.log(
      `Target: ${channel.displayName ?? channel.name} (${channel.externalLink ?? channel.id})`,
    );
    console.log(`Scheduled posts: ${scheduled.length}`);
    for (const post of scheduled) {
      console.log(
        `${post.dueAt ?? 'NO DATE'}  ${post.id}  ${post.text.split('\n')[0]}`,
      );
    }
    console.log(`Draft posts: ${drafts.length}`);
    for (const post of drafts) {
      console.log(`${post.id}  ${post.text.split('\n')[0]}`);
    }
    return;
  }
  if (
    !activateDrafts &&
    manifest.posts.some((post) => new Date(dueAt(post)) <= new Date())
  ) {
    throw new Error('At least one campaign post is no longer in the future.');
  }

  const { organization, channel } = await resolveTarget();
  await verifyAssets(manifest.posts);
  const scheduled = await getScheduledPosts(organization.id, channel.id);
  const drafts = await getDraftPosts(organization.id, channel.id);
  const campaignCopies = new Set(manifest.posts.map((post) => post.xCopy));
  const existingCampaignPosts = scheduled.filter((post) =>
    campaignCopies.has(post.text),
  );
  const existingCampaignDrafts = drafts.filter((post) =>
    campaignCopies.has(post.text),
  );

  console.log(
    `Target: ${channel.displayName ?? channel.name} (${channel.externalLink ?? channel.id})`,
  );
  console.log(`Hosted images verified: ${manifest.posts.length}`);
  console.log(
    `Existing campaign posts in Buffer: ${existingCampaignPosts.length}`,
  );
  console.log(
    `Existing campaign drafts in Buffer: ${existingCampaignDrafts.length}`,
  );

  if (activateDrafts) {
    if (existingCampaignDrafts.length === 0) {
      console.log('No campaign drafts need scheduling.');
      return;
    }
    for (const draft of existingCampaignDrafts) {
      const post = manifest.posts.find(
        (candidate) => candidate.xCopy === draft.text,
      );
      if (!post) {
        throw new Error(`No campaign post matches Buffer draft ${draft.id}.`);
      }
      if (new Date(dueAt(post)) <= new Date()) {
        throw new Error(
          `${post.team}'s scheduled time is no longer in the future.`,
        );
      }
      console.log(
        `${apply ? 'Scheduling' : 'Would schedule'} ${post.team} draft ${draft.id} for ${dueAt(post)}`,
      );
      if (!apply) {
        continue;
      }

      const scheduledPost = await scheduleDraftThread(post, draft.id);
      if (scheduledPost.dueAt !== dueAt(post)) {
        throw new Error(
          `${post.team} dueAt mismatch: ${scheduledPost.dueAt} != ${dueAt(post)}`,
        );
      }
    }
    if (!apply) {
      console.log('Dry run only. Pass --apply to schedule campaign drafts.');
      return;
    }

    const remainingDrafts = (
      await getDraftPosts(organization.id, channel.id)
    ).filter((post) => campaignCopies.has(post.text));
    if (remainingDrafts.length !== 0) {
      throw new Error(
        `Expected no campaign drafts after activation; found ${remainingDrafts.length}.`,
      );
    }
    console.log(
      `Scheduled ${existingCampaignDrafts.length} campaign draft(s).`,
    );
    return;
  }

  if (!apply) {
    for (const post of manifest.posts) {
      console.log(
        `${String(post.sequence).padStart(2, '0')} ${post.team}: ${dueAt(post)} ${imageUrl(post)}`,
      );
    }
    console.log('Dry run only. Pass --apply to schedule missing posts.');
    return;
  }

  const receipts: Receipt['posts'] = [];
  for (const post of manifest.posts) {
    const existing = existingCampaignPosts.find(
      (candidate) => candidate.text === post.xCopy,
    );
    const existingDraft = existingCampaignDrafts.find(
      (candidate) => candidate.text === post.xCopy,
    );
    let bufferPost = existing ?? existingDraft;
    let status: 'scheduled' | 'draft' = existing ? 'scheduled' : 'draft';

    if (!bufferPost) {
      try {
        bufferPost = await createScheduledThread(post, channel.id);
        status = 'scheduled';
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes('Scheduled posts limit reached')
        ) {
          throw error;
        }
        bufferPost = await createDraftThread(post, channel.id);
        status = 'draft';
      }
    }

    if (status === 'scheduled' && bufferPost.dueAt !== dueAt(post)) {
      throw new Error(
        `${post.team} dueAt mismatch: ${bufferPost.dueAt} != ${dueAt(post)}`,
      );
    }
    receipts.push({
      sequence: post.sequence,
      team: post.team,
      bufferPostId: bufferPost.id,
      status,
      dueAt: status === 'scheduled' ? dueAt(post) : null,
      imageUrl: imageUrl(post),
    });
    console.log(
      `${existing || existingDraft ? 'Verified' : status === 'scheduled' ? 'Scheduled' : 'Drafted'} ${post.team}: ${bufferPost.id}${status === 'scheduled' ? ` at ${bufferPost.dueAt}` : ' (ready to schedule when a slot opens)'}`,
    );
  }

  const after = await getScheduledPosts(organization.id, channel.id);
  const afterDrafts = await getDraftPosts(organization.id, channel.id);
  const confirmed = after.filter((post) => campaignCopies.has(post.text));
  const confirmedDrafts = afterDrafts.filter((post) =>
    campaignCopies.has(post.text),
  );
  if (confirmed.length + confirmedDrafts.length !== manifest.posts.length) {
    throw new Error(
      `Expected ${manifest.posts.length} scheduled or drafted campaign posts after submission; found ${confirmed.length} scheduled and ${confirmedDrafts.length} drafted.`,
    );
  }

  await mkdir(campaignDir, { recursive: true });
  const receipt: Receipt = {
    generatedAt: new Date().toISOString(),
    organization,
    channel,
    assetBaseUrl,
    posts: receipts,
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(
    `Verified ${confirmed.length} scheduled posts and ${confirmedDrafts.length} drafts in Buffer.`,
  );
  console.log(`Wrote receipt to ${receiptPath}`);
}

await main();
