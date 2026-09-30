import { v } from 'convex/values';

export const raceVideoKind = v.union(
  v.literal('fp1'),
  v.literal('fp2'),
  v.literal('fp3'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('quali'),
  v.literal('race'),
  v.literal('radio'),
);

export function validateVideoId(videoId: string) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error('Invalid YouTube video ID');
  }
}

export function officialVideoMetadata(value: unknown): { title: string } {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid YouTube metadata');
  }
  const data = value as Record<string, unknown>;
  const officialChannels = [
    'https://www.youtube.com/@Formula1',
    'https://www.youtube.com/channel/UCB_qr75-ydFVKSF9Dmo6izg',
  ];
  if (!officialChannels.includes(String(data.author_url))) {
    throw new Error('Video must be from the official FORMULA 1 channel');
  }
  if (
    typeof data.title !== 'string' ||
    !data.title.trim() ||
    data.title.length > 300
  ) {
    throw new Error('Invalid YouTube video title');
  }
  return { title: data.title };
}
