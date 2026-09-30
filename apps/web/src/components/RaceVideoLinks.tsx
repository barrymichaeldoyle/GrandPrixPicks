import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { useQuery } from '@/integrations/convex/query';
import { RaceVideoLink } from './RaceVideoLink';

/** Competitive highlights live here; practice links live beside their timing sheets. */
export function RaceVideoLinks({
  raceSlug,
  kind,
}: {
  raceSlug: string;
  kind?: Doc<'raceVideos'>['kind'];
}) {
  const videos = useQuery(api.raceVideos.list, { raceSlug });
  const visible = (videos ?? []).filter((video) =>
    kind ? video.kind === kind : !['fp1', 'fp2', 'fp3'].includes(video.kind),
  );
  if (!visible.length) {
    return null;
  }
  const order = ['sprint_quali', 'sprint', 'quali', 'race', 'radio'];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 py-3">
      {[...visible]
        .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
        .map((video) => (
          <RaceVideoLink
            key={video._id}
            videoId={video.videoId}
            kind={video.kind}
            raceSlug={raceSlug}
          />
        ))}
    </div>
  );
}
