import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUFFER_API_URL = 'https://api.buffer.com';
const ASSET_BASE_URL =
  'https://gpp-social-assets-2026.pages.dev/social/instagram-h2h-2026';

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
type ImageAsset = {
  source: string;
  mimeType: string;
  image?: { altText: string; width: number; height: number };
};
type InstagramMetadata = {
  firstComment: string | null;
  type: 'post' | 'story' | 'reel';
  shouldShareToFeed: boolean;
  isAiGenerated: boolean;
  stickerFields: { other: string | null; text: string | null } | null;
};
type ScheduledPost = {
  id: string;
  text: string;
  dueAt: string | null;
  status: string;
  channelId: string;
  assets: ImageAsset[];
  metadata: InstagramMetadata | null;
};
type FeedPost = {
  kind: 'feed';
  key: string;
  dueAt: string;
  text: string;
  firstComment: string;
  files: string[];
  altTexts: string[];
};
type StoryPost = {
  kind: 'story';
  key: string;
  team: string;
  dueAt: string;
  text: string;
  file: string;
  leftChoice: string;
  rightChoice: string;
  altText: string;
};
type CampaignPost = FeedPost | StoryPost;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const campaignDir = path.join(repoRoot, 'artifacts/social/instagram-h2h-2026');
const copyPath = path.join(campaignDir, 'instagram-posts.md');
const receiptPath = path.join(campaignDir, 'buffer-schedule.json');
const apiKey = process.env.BUFFER_API_KEY;
if (!apiKey) throw new Error('BUFFER_API_KEY is missing.');

const apply = process.argv.includes('--apply');

function extractRange(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) throw new Error(`Missing content heading: ${start}`);
  const contentStart = startIndex + start.length;
  const endIndex = end ? source.indexOf(end, contentStart) : source.length;
  if (end && endIndex === -1)
    throw new Error(`Missing content heading: ${end}`);
  return source.slice(contentStart, endIndex).trim();
}

function extractSubsection(source: string, heading: string): string {
  const marker = `### ${heading}`;
  const startIndex = source.indexOf(marker);
  if (startIndex === -1) throw new Error(`Missing subsection: ${heading}`);
  const contentStart = startIndex + marker.length;
  const nextHeading = source.indexOf('\n### ', contentStart);
  return source
    .slice(contentStart, nextHeading === -1 ? source.length : nextHeading)
    .trim();
}

function paragraphText(source: string): string {
  return source.replace(/\n{3,}/g, '\n\n').trim();
}

function slideAltTexts(source: string): string[] {
  const altSection = extractSubsection(source, 'Alt text');
  return [
    ...altSection.matchAll(/#### Slide \d+\n\n([\s\S]*?)(?=\n#### Slide|$)/g),
  ].map((match) => match[1]!.replace(/\n+/g, ' ').trim());
}

function imageUrl(file: string): string {
  return `${ASSET_BASE_URL}/${file}`;
}

async function loadPosts(): Promise<CampaignPost[]> {
  const markdown = await readFile(copyPath, 'utf8');
  const post1 = extractRange(markdown, '## Post 1:', '## Post 2:');
  const post2 = extractRange(markdown, '## Post 2:', '## Post 3:');
  const post3 = extractRange(markdown, '## Post 3:', '## Story polls');

  const post1Alt = paragraphText(extractSubsection(post1, 'Alt text'));
  const post2Alt = slideAltTexts(post2);
  const post3Alt = slideAltTexts(post3);
  const feedPosts: FeedPost[] = [
    {
      kind: 'feed',
      key: 'every-team-mate-battle',
      dueAt: '2026-08-09T17:00:00.000Z',
      text: paragraphText(extractSubsection(post1, 'Caption')),
      firstComment: paragraphText(extractSubsection(post1, 'First comment')),
      files: ['01-full-grid-scorecard/01-scorecard.png'],
      altTexts: [post1Alt],
    },
    {
      kind: 'feed',
      key: 'score-needs-context',
      dueAt: '2026-08-12T16:30:00.000Z',
      text: paragraphText(extractSubsection(post2, 'Caption')),
      firstComment: paragraphText(extractSubsection(post2, 'First comment')),
      files: [
        '02-score-needs-context/01-cover.png',
        '02-score-needs-context/02-ferrari.png',
        '02-score-needs-context/03-audi.png',
        '02-score-needs-context/04-mclaren.png',
        '02-score-needs-context/05-mercedes.png',
        '02-score-needs-context/06-williams.png',
        '02-score-needs-context/07-cadillac.png',
        '02-score-needs-context/08-racing-bulls.png',
        '02-score-needs-context/09-your-call.png',
      ],
      altTexts: post2Alt,
    },
    {
      kind: 'feed',
      key: 'drivers-in-control',
      dueAt: '2026-08-16T17:00:00.000Z',
      text: paragraphText(extractSubsection(post3, 'Caption')),
      firstComment: paragraphText(extractSubsection(post3, 'First comment')),
      files: [
        '03-drivers-in-control/01-cover.png',
        '03-drivers-in-control/02-red-bull-racing.png',
        '03-drivers-in-control/03-haas.png',
        '03-drivers-in-control/04-aston-martin.png',
        '03-drivers-in-control/05-alpine.png',
        '03-drivers-in-control/06-your-call.png',
      ],
      altTexts: post3Alt,
    },
  ];

  const storyBlueprints = [
    [
      'Ferrari',
      '2026-08-11T10:30:00.000Z',
      '01-ferrari.png',
      'Leclerc',
      'Hamilton',
    ],
    [
      'McLaren',
      '2026-08-11T17:30:00.000Z',
      '02-mclaren.png',
      'Norris',
      'Piastri',
    ],
    [
      'Audi',
      '2026-08-13T10:30:00.000Z',
      '03-audi.png',
      'Bortoleto',
      'Hülkenberg',
    ],
    [
      'Williams',
      '2026-08-13T17:30:00.000Z',
      '04-williams.png',
      'Sainz',
      'Albon',
    ],
    [
      'Red Bull Racing',
      '2026-08-18T10:30:00.000Z',
      '05-red-bull-racing.png',
      'Verstappen',
      'Hadjar',
    ],
    [
      'Mercedes',
      '2026-08-18T17:30:00.000Z',
      '06-mercedes.png',
      'Antonelli',
      'Russell',
    ],
    [
      'Cadillac',
      '2026-08-20T10:30:00.000Z',
      '07-cadillac.png',
      'Pérez',
      'Bottas',
    ],
    ['Haas', '2026-08-20T17:30:00.000Z', '08-haas.png', 'Bearman', 'Ocon'],
    [
      'Racing Bulls',
      '2026-08-22T10:30:00.000Z',
      '09-racing-bulls.png',
      'Lawson',
      'Lindblad',
    ],
    [
      'Aston Martin',
      '2026-08-22T17:30:00.000Z',
      '10-aston-martin.png',
      'Alonso',
      'Stroll',
    ],
    [
      'Alpine',
      '2026-08-24T17:30:00.000Z',
      '11-alpine.png',
      'Gasly',
      'Colapinto',
    ],
  ] as const;
  const storyPosts: StoryPost[] = storyBlueprints.map(
    ([team, dueAt, filename, leftChoice, rightChoice]) => ({
      kind: 'story',
      key: `story-${team.toLowerCase().replaceAll(' ', '-')}`,
      team,
      dueAt,
      text: `Story poll reminder: ${team} team-mate battle`,
      file: `stories/${filename}`,
      leftChoice,
      rightChoice,
      altText: `${team} team-mate poll graphic asking who finishes 2026 ahead: ${leftChoice} or ${rightChoice}.`,
    }),
  );

  for (const post of feedPosts) {
    if (post.files.length !== post.altTexts.length) {
      throw new Error(
        `${post.key} has ${post.files.length} files but ${post.altTexts.length} alt texts.`,
      );
    }
  }
  return [...feedPosts, ...storyPosts];
}

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
      `Expected exactly one connected, unlocked Instagram channel; found ${candidates.length}.`,
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
      firstComment type shouldShareToFeed isAiGenerated
      stickerFields { other text }
    }
  }
`;

async function getPosts(
  organizationId: string,
  channelId: string,
): Promise<ScheduledPost[]> {
  const result = await bufferRequest<{
    posts: { edges: Array<{ node: ScheduledPost }> };
  }>(
    `query GetInstagramCampaignPosts(
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

async function verifyAssets(posts: CampaignPost[]): Promise<void> {
  const urls = posts.flatMap((post) =>
    post.kind === 'feed' ? post.files.map(imageUrl) : [imageUrl(post.file)],
  );
  for (const url of urls) {
    let response: Response | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      response = await fetch(url, { method: 'HEAD' });
      if (response.ok) break;
    }
    if (!response?.ok || response.headers.get('content-type') !== 'image/png') {
      throw new Error(
        `Invalid hosted image: ${response?.status} ${response?.headers.get('content-type')} ${url}`,
      );
    }
  }
}

function storyInstructions(post: StoryPost): string {
  return `Add the Instagram Poll sticker in the open lower area. Question: Your pick? Choices: ${post.leftChoice} / ${post.rightChoice}. Publish, then add this Story to the H2H 2026 Highlight.`;
}

async function createPost(
  post: CampaignPost,
  channelId: string,
): Promise<ScheduledPost> {
  const assets =
    post.kind === 'feed'
      ? post.files.map((file, index) => ({
          image: {
            url: imageUrl(file),
            metadata: { altText: post.altTexts[index]! },
          },
        }))
      : [
          {
            image: {
              url: imageUrl(post.file),
              metadata: { altText: post.altText },
            },
          },
        ];
  const instagram =
    post.kind === 'feed'
      ? {
          type: 'post',
          firstComment: post.firstComment,
          shouldShareToFeed: true,
          isAiGenerated: false,
        }
      : {
          type: 'story',
          shouldShareToFeed: false,
          isAiGenerated: false,
          stickerFields: { other: storyInstructions(post) },
        };
  const result = await bufferRequest<{
    createPost:
      | { post: ScheduledPost; message?: never }
      | { post?: never; message: string };
  }>(
    `mutation CreateInstagramCampaignPost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { ${postFields} } }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        text: post.text,
        channelId,
        schedulingType: post.kind === 'feed' ? 'automatic' : 'notification',
        mode: 'customScheduled',
        dueAt: post.dueAt,
        assets,
        metadata: { instagram },
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

function verifyPost(expected: CampaignPost, actual: ScheduledPost): void {
  if (actual.dueAt !== expected.dueAt) {
    throw new Error(
      `${expected.key} dueAt mismatch: ${actual.dueAt} != ${expected.dueAt}`,
    );
  }
  const expectedAssets = expected.kind === 'feed' ? expected.files.length : 1;
  if (actual.assets.length !== expectedAssets) {
    throw new Error(
      `${expected.key} asset count mismatch: ${actual.assets.length} != ${expectedAssets}`,
    );
  }
  if (expected.kind === 'feed') {
    if (actual.metadata?.type !== 'post') {
      throw new Error(`${expected.key} is not an Instagram feed post.`);
    }
    if (actual.metadata.firstComment !== expected.firstComment) {
      throw new Error(`${expected.key} first comment did not persist.`);
    }
    for (const [index, altText] of expected.altTexts.entries()) {
      if (actual.assets[index]?.image?.altText !== altText) {
        throw new Error(
          `${expected.key} alt text did not persist for image ${index + 1}.`,
        );
      }
    }
  } else {
    if (actual.metadata?.type !== 'story') {
      throw new Error(`${expected.key} is not an Instagram Story.`);
    }
    if (actual.metadata.stickerFields?.other !== storyInstructions(expected)) {
      throw new Error(`${expected.key} Story instructions did not persist.`);
    }
  }
}

async function main(): Promise<void> {
  const posts = await loadPosts();
  const { organization, channel } = await resolveTarget();
  const current = await getPosts(organization.id, channel.id);
  const existingByText = new Map(current.map((post) => [post.text, post]));

  console.log(
    `Target: ${channel.displayName ?? channel.name} (${channel.externalLink ?? channel.id})`,
  );
  if (!channel.hasActiveMemberDevice) {
    console.warn(
      'Warning: no active Buffer mobile device is registered for Story notifications.',
    );
  }
  for (const post of posts) {
    const existing = existingByText.get(post.text);
    console.log(
      `${existing ? 'Existing' : apply ? 'Scheduling' : 'Would schedule'} ${post.key} for ${post.dueAt}`,
    );
  }
  if (!apply) {
    console.log('Dry run only. Pass --apply to schedule missing posts.');
    return;
  }

  await verifyAssets(posts);
  const scheduledPosts: Array<{
    key: string;
    kind: 'feed' | 'story';
    team?: string;
    bufferPostId: string;
    dueAt: string;
    status: string;
    assetUrls: string[];
    firstCommentVerified: boolean | null;
    altTextVerified: boolean | null;
    storyInstructionsVerified: boolean | null;
  }> = [];
  for (const post of posts) {
    const existing = existingByText.get(post.text);
    const scheduled = existing ?? (await createPost(post, channel.id));
    verifyPost(post, scheduled);
    scheduledPosts.push({
      key: post.key,
      kind: post.kind,
      ...(post.kind === 'story' ? { team: post.team } : {}),
      bufferPostId: scheduled.id,
      dueAt: post.dueAt,
      status: scheduled.status,
      assetUrls:
        post.kind === 'feed' ? post.files.map(imageUrl) : [imageUrl(post.file)],
      firstCommentVerified:
        post.kind === 'feed'
          ? scheduled.metadata?.firstComment === post.firstComment
          : null,
      altTextVerified:
        post.kind === 'feed'
          ? post.altTexts.every(
              (altText, index) =>
                scheduled.assets[index]?.image?.altText === altText,
            )
          : null,
      storyInstructionsVerified:
        post.kind === 'story'
          ? scheduled.metadata?.stickerFields?.other === storyInstructions(post)
          : null,
    });
  }

  const after = await getPosts(organization.id, channel.id);
  const afterByText = new Map(after.map((post) => [post.text, post]));
  for (const post of posts) {
    const scheduled = afterByText.get(post.text);
    if (!scheduled) {
      throw new Error(`${post.key} was not found in Buffer after scheduling.`);
    }
    verifyPost(post, scheduled);
  }

  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        organization,
        channel,
        assetBaseUrl: ASSET_BASE_URL,
        mobileNotificationReady: channel.hasActiveMemberDevice,
        posts: scheduledPosts,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Verified ${posts.length} Instagram campaign posts in Buffer.`);
  console.log(`Wrote receipt to ${receiptPath}`);
}

await main();
