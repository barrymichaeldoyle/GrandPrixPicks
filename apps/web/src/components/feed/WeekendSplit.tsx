/**
 * The break between two race weekends in the activity stream.
 *
 * No label: the block underneath already flies the flag and names the race, and
 * saying it again here would be the interface narrating its own layout. This
 * mark has one job, which is "different weekend".
 *
 * Full bleed on a phone, where the blocks either side of it are too, so the
 * chequer runs wall to wall instead of sitting in a gutter the rows ignore.
 */
export function WeekendSplit() {
  return (
    /* Only the phone's spacing is set here. From `md` the stream's own
       `space-y-4` already puts 16px under every block including this one, and
       a margin of our own would replace that on one side only: the rule sets
       margin-bottom, so `my-1` left 16px above the chequer and 4px below it.
       The extra pixel underneath pays back the `-mt-px` every block carries to
       collapse its hairline into the card above it. There is no hairline to
       collapse here, so without it the gap below runs 1px short of the one
       above. */
    <div
      className="max-md:-mx-4 max-md:mt-3 max-md:mb-[calc(var(--spacing)*3+1px)]"
      aria-hidden="true"
    >
      <div className="gpp-weekend-split" />
    </div>
  );
}
