/**
 * Mirrors the site's news feed into the subreddit. Rules and reasons are in
 * `docs/reddit-news-app.md`; this module holds them, and takes Redis and the
 * Reddit client as arguments so the rules can be tested without either.
 */

/** One item from `GET /api/news/recent`. */
export type NewsItem = {
  id: string;
  headline: string;
  body: string;
  sourceName: string;
  sourceUrl: string;
  raceSlug: string | null;
  createdAt: number;
};

/** What the app remembers about an item it has posted. */
export type TrackedPost = {
  postId: string;
  /** Null when the post went up but the summary comment did not. */
  commentId: string | null;
  headline: string;
  sourceUrl: string;
  body: string;
  createdAt: number;
};

export type Store = {
  getSince(): Promise<number | undefined>;
  setSince(since: number): Promise<void>;
  getAll(): Promise<Record<string, TrackedPost>>;
  put(id: string, post: TrackedPost): Promise<void>;
  remove(id: string): Promise<void>;
};

export type RedditActions = {
  /** Link post to the source, then the pinned summary comment. */
  post(item: NewsItem): Promise<{ postId: string; commentId: string | null }>;
  editComment(commentId: string, body: string): Promise<void>;
  deletePost(postId: string): Promise<void>;
};

export type SyncReport = {
  posted: string[];
  edited: string[];
  deleted: string[];
  failed: string[];
};

const HOUR = 60 * 60 * 1000;

/** How far back the first run reaches, so an install does not flood. */
export const BACKFILL_MS = 24 * HOUR;
/**
 * How long a post is kept in step with the site. Well inside the endpoint's
 * 14-day window, so an item missing from the list was removed, not aged out.
 */
export const TRACK_MS = 7 * 24 * HOUR;
/** New posts per run. The rest wait ten minutes for the next one. */
export const MAX_NEW_PER_RUN = 5;

export async function syncNews({
  items,
  now,
  store,
  reddit,
  log = console.error,
}: {
  items: NewsItem[];
  now: number;
  store: Store;
  reddit: RedditActions;
  log?: (message: string, error?: unknown) => void;
}): Promise<SyncReport> {
  const report: SyncReport = {
    posted: [],
    edited: [],
    deleted: [],
    failed: [],
  };

  let since = await store.getSince();
  if (since === undefined) {
    since = now - BACKFILL_MS;
    await store.setSince(since);
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const tracked = await store.getAll();

  for (const [id, post] of Object.entries(tracked)) {
    if (post.createdAt < now - TRACK_MS) {
      await store.remove(id);
      delete tracked[id];
      continue;
    }

    const item = byId.get(id);
    if (!item) {
      // An empty list is far more likely to be a broken endpoint than every
      // story being retracted at once.
      if (items.length === 0) {
        continue;
      }
      await removePost(id, post);
      continue;
    }

    // Reddit cannot edit a title or a link, so the post goes up again.
    if (item.headline !== post.headline || item.sourceUrl !== post.sourceUrl) {
      await removePost(id, post);
      continue;
    }

    if (item.body !== post.body && post.commentId) {
      try {
        await reddit.editComment(post.commentId, item.body);
        await store.put(id, { ...post, body: item.body });
        report.edited.push(id);
      } catch (error) {
        log(`[gpp-news] edit ${id} failed`, error);
        report.failed.push(id);
      }
    }
  }

  const fresh = items
    .filter(
      (item) =>
        !tracked[item.id] &&
        item.createdAt >= since &&
        item.createdAt >= now - TRACK_MS,
    )
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, MAX_NEW_PER_RUN);

  for (const item of fresh) {
    try {
      const { postId, commentId } = await reddit.post(item);
      await store.put(item.id, {
        postId,
        commentId,
        headline: item.headline,
        sourceUrl: item.sourceUrl,
        body: item.body,
        createdAt: item.createdAt,
      });
      report.posted.push(item.id);
    } catch (error) {
      log(`[gpp-news] post ${item.id} failed`, error);
      report.failed.push(item.id);
    }
  }

  return report;

  // Forgets the post even when the delete fails: a post a moderator already
  // removed would otherwise be retried every ten minutes forever.
  async function removePost(id: string, post: TrackedPost) {
    try {
      await reddit.deletePost(post.postId);
      report.deleted.push(id);
    } catch (error) {
      log(`[gpp-news] delete ${id} failed`, error);
      report.failed.push(id);
    }
    await store.remove(id);
    delete tracked[id];
  }
}

/**
 * Validates the endpoint's response. Throws on anything unexpected, so a
 * malformed answer stops the run instead of reading as "no news".
 */
export function parseNewsResponse(json: unknown): NewsItem[] {
  if (!isRecord(json) || !Array.isArray(json.items)) {
    throw new Error('News response has no items array');
  }
  return json.items.map((raw, index) => {
    if (
      !isRecord(raw) ||
      typeof raw.id !== 'string' ||
      typeof raw.headline !== 'string' ||
      typeof raw.body !== 'string' ||
      typeof raw.sourceName !== 'string' ||
      typeof raw.sourceUrl !== 'string' ||
      !raw.sourceUrl.startsWith('https://') ||
      (raw.raceSlug !== null && typeof raw.raceSlug !== 'string') ||
      typeof raw.createdAt !== 'number'
    ) {
      throw new Error(`News item ${index} is malformed`);
    }
    return {
      id: raw.id,
      headline: raw.headline,
      body: raw.body,
      sourceName: raw.sourceName,
      sourceUrl: raw.sourceUrl,
      raceSlug: raw.raceSlug,
      createdAt: raw.createdAt,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
