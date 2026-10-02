import { SaxesParser } from 'saxes';
import type { Doc } from '../_generated/dataModel';

export const F1_CHANNEL = 'UCB_qr75-ydFVKSF9Dmo6izg';
export const YOUTUBE_TOPIC = `https://www.youtube.com/feeds/videos.xml?channel_id=${F1_CHANNEL}`;
export type Upload = {
  videoId: string;
  title: string;
  publishedAt: number;
  sourceUpdatedAt: number;
};

export async function boundedBody(
  response: Response | Request,
): Promise<Uint8Array> {
  if (!response.body) {
    throw new Error('Empty body');
  }
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) {
      break;
    }
    length += part.value.length;
    if (length > 128000) {
      await reader.cancel();
      throw new Error('Body too large');
    }
    parts.push(part.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

export function parseUploads(xml: string): Upload[] {
  if (
    new TextEncoder().encode(xml).length > 128000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml)
  ) {
    throw new Error('Unsafe XML');
  }
  const parser = new SaxesParser({ xmlns: true });
  const uploads: Upload[] = [];
  let entry: Record<string, string> | null = null;
  let field = '';
  let text = '';
  parser.on('opentag', (tag) => {
    if (tag.local === 'entry' && tag.uri === 'http://www.w3.org/2005/Atom') {
      entry = {};
    }
    field =
      tag.uri === 'http://www.youtube.com/xml/schemas/2015' ||
      tag.uri === 'http://www.w3.org/2005/Atom'
        ? tag.local
        : '';
    text = '';
  });
  parser.on('text', (value) => {
    text += value;
    if (text.length > 4000) {
      throw new Error('XML field too large');
    }
  });
  parser.on('closetag', (tag) => {
    if (entry && field === tag.local) {
      entry[field] = text;
    }
    if (tag.local === 'entry' && entry) {
      const publishedAt = Date.parse(entry.published ?? '');
      const sourceUpdatedAt = Date.parse(entry.updated ?? '');
      if (
        entry.channelId !== F1_CHANNEL ||
        !/^[\w-]{11}$/.test(entry.videoId ?? '') ||
        !entry.title ||
        entry.title.length > 300 ||
        !Number.isFinite(publishedAt) ||
        !Number.isFinite(sourceUpdatedAt)
      ) {
        throw new Error('Invalid upload');
      }
      uploads.push({
        videoId: entry.videoId!,
        title: entry.title,
        publishedAt,
        sourceUpdatedAt,
      });
      if (uploads.length > 30) {
        throw new Error('Too many uploads');
      }
      entry = null;
    }
    field = '';
    text = '';
  });
  parser.on('error', (error) => {
    throw error;
  });
  parser.write(xml).close();
  return uploads;
}

export async function validSignature(
  secret: string,
  header: string | null,
  bytes: Uint8Array,
): Promise<boolean> {
  const match = /^(sha1|sha256)=([a-fA-F0-9]+)$/.exec(header ?? '');
  if (!match || match[2]!.length !== (match[1] === 'sha1' ? 40 : 64)) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: match[1] === 'sha1' ? 'SHA-1' : 'SHA-256' },
    false,
    ['verify'],
  );
  const signature = Uint8Array.from(match[2]!.match(/../g)!, (value) =>
    parseInt(value, 16),
  );
  return await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    bytes as Uint8Array<ArrayBuffer>,
  );
}

function normalized(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
export function matchUpload(
  upload: Upload,
  races: Doc<'races'>[],
): { raceSlug: string; kind: Doc<'raceVideos'>['kind'] } | string {
  const title = normalized(upload.title);
  if (
    /\b(f2|f3|formula 2|formula 3|academy|classic|throwback|on this day|best of|top 10|extended)\b/.test(
      title,
    )
  ) {
    return 'Unsupported or historical video';
  }
  const kinds: Doc<'raceVideos'>['kind'][] = [];
  if (/\bradio rewind\b/.test(title)) {
    kinds.push('radio');
  }
  if (/\bhighlights\b/.test(title)) {
    if (/\b(fp1|practice 1|free practice 1)\b/.test(title)) {
      kinds.push('fp1');
    }
    if (/\b(fp2|practice 2|free practice 2)\b/.test(title)) {
      kinds.push('fp2');
    }
    if (/\b(fp3|practice 3|free practice 3)\b/.test(title)) {
      kinds.push('fp3');
    }
    if (/\bsprint (qualifying|quali|shootout)\b/.test(title)) {
      kinds.push('sprint_quali');
    } else if (/\bsprint\b/.test(title)) {
      kinds.push('sprint');
    } else if (/\b(qualifying|quali)\b/.test(title)) {
      kinds.push('quali');
    }
    if (/\brace highlights\b/.test(title) && !/\bsprint\b/.test(title)) {
      kinds.push('race');
    }
  }
  if (kinds.length !== 1) {
    return 'Video type needs review';
  }
  const years = [...new Set(title.match(/\b20\d{2}\b/g) ?? [])];
  if (years.length > 1) {
    return 'Race year needs review';
  }
  // F1 sometimes drops the year ("FP2 Highlights | Bahrain Grand Prix in
  // Malaysia"). The publish year is then safe: the window check below still
  // ties the upload to that weekend.
  const year = years.length
    ? Number(years[0])
    : new Date(upload.publishedAt).getUTCFullYear();
  const aliases: Record<string, string[]> = {
    italy: ['italian'],
    australia: ['australian'],
    britain: ['british'],
    austria: ['austrian'],
    hungary: ['hungarian'],
    belgium: ['belgian'],
    netherlands: ['dutch'],
    japan: ['japanese'],
    spain: ['spanish'],
    madrid: ['spanish'],
    china: ['chinese'],
    mexico: ['mexico city'],
  };
  const matches = races.filter((race) => {
    const slug = race.slug.replace(/-20\d{2}$/, '');
    const names = [
      normalized(race.name.replace(/grand prix/gi, '')),
      normalized(slug),
      ...(aliases[slug] ?? []),
    ];
    return (
      race.season === year &&
      race.status !== 'cancelled' &&
      names.some(
        (name) => name && ` ${title} `.includes(` ${name} grand prix `),
      ) &&
      upload.publishedAt >=
        (race.fp1StartAt ?? race.raceStartAt - 3 * 86400000) - 86400000 &&
      upload.publishedAt <= race.raceStartAt + 7 * 86400000
    );
  });
  if (matches.length !== 1) {
    return 'Race needs review';
  }
  const race = matches[0]!;
  const kind = kinds[0]!;
  if (
    (race.hasSprint && (kind === 'fp2' || kind === 'fp3')) ||
    (!race.hasSprint && (kind === 'sprint' || kind === 'sprint_quali'))
  ) {
    return 'Session does not belong to this weekend';
  }
  return { raceSlug: race.slug, kind };
}
