/**
 * His own banner artwork, lifted from the form this page replaces.
 *
 * The files live in `public/chinwag/`. They are his: coral-and-white duotone
 * race photography with the category name burned in, and they are most of what
 * makes his form look like his. Rebuilding them as flat coral bands with our
 * own type on top got the structure right and the feel wrong, which is the
 * whole thing a creator would judge this on.
 *
 * They ship with the POC so he can see his page rather than an approximation.
 * If he takes this on, he supplies the files and these get replaced by his.
 *
 * The header image carries no category, so it needs no title. Each question's
 * image already contains its own heading, which is why nothing is drawn over
 * them: the artwork is the label.
 */
const BANNERS = {
  header: 'header',
  pole: 'pole',
  winner: 'winner',
  bangerDriver: 'bangerDriver',
  clangerDriver: 'clangerDriver',
  bangerTeam: 'bangerTeam',
  clangerTeam: 'clangerTeam',
} as const;

export type ChinwagBannerId = keyof typeof BANNERS;

type ChinwagBannerProps = {
  className?: string;
  /** Which artwork to show. */
  id: ChinwagBannerId;
  /**
   * Read out in place of the image, since the words in the artwork are the
   * heading and a screen reader would otherwise get nothing at all.
   */
  title: string;
};

export function ChinwagBanner({
  className = '',
  id,
  title,
}: ChinwagBannerProps) {
  return (
    <img
      alt={title}
      className={`block w-full ${className}`}
      // Intrinsic ratio of the source files, so nothing reflows as they load.
      height={id === 'header' ? 300 : 497}
      src={`/chinwag/${BANNERS[id]}.webp`}
      width={1200}
    />
  );
}
