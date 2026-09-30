import type { Doc } from '@convex-generated/dataModel';
import { ExternalLink } from 'lucide-react';
import { captureAnalyticsEvent } from '@/lib/analytics';

type VideoKind = Doc<'raceVideos'>['kind'];
const VIDEO_LABELS: Record<VideoKind, string> = {
  fp1: 'Watch FP1 highlights',
  fp2: 'Watch FP2 highlights',
  fp3: 'Watch FP3 highlights',
  sprint_quali: 'Watch sprint qualifying highlights',
  sprint: 'Watch sprint highlights',
  quali: 'Watch qualifying highlights',
  race: 'Watch race highlights',
  radio: 'Watch Radio Rewind',
};

/** A watch-page link; F1 rights restrictions can block third-party players. */
export function RaceVideoLink({
  videoId,
  kind,
  raceSlug,
}: {
  videoId: string | undefined;
  kind: VideoKind;
  raceSlug?: string;
}) {
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return null;
  }
  return (
    <a
      href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${VIDEO_LABELS[kind]} on YouTube (opens in a new tab)`}
      className="gpp-touch-target inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
      onClick={() =>
        captureAnalyticsEvent('race_video_clicked', {
          video_id: videoId,
          video_kind: kind,
          ...(raceSlug ? { race_slug: raceSlug } : {}),
        })
      }
    >
      {VIDEO_LABELS[kind]}
      <ExternalLink size={14} aria-hidden />
    </a>
  );
}
