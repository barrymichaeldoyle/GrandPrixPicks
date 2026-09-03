export type WriteUpNewsPhotoProps = {
  src: string;
  /** Width-descriptor set, as the track map uses. Omitted for a single file. */
  srcSet?: string;
  sizes?: string;
  alt: string;
  width: number;
  height: number;
  /**
   * Where and when the photo was taken, when that is not the race the page is
   * about. The alt text carries it too, but only a screen reader reads that:
   * without the caption a sighted reader sees a car at a circuit that is
   * plainly not this one and has nothing telling them where it is.
   */
  context?: string;
  creditName: string;
  creditUrl: string;
  licenseName: string;
  licenseUrl: string;
  modificationNote?: string;
};

/** Write-up news photo with the house CC attribution caption. */
export function WriteUpNewsPhoto({
  src,
  srcSet,
  sizes,
  alt,
  width,
  height,
  context,
  creditName,
  creditUrl,
  licenseName,
  licenseUrl,
  modificationNote,
}: WriteUpNewsPhotoProps) {
  // A portrait photo at the full width of a reading column paints taller than
  // the viewport, and drags the section's 3px team bar down past everything it
  // is meant to mark. Capped here rather than at the call site because it is a
  // property of the image, not of where it is used, and the news card gets its
  // images from Convex with no place to pass layout classes through.
  const isPortrait = height > width;

  return (
    <figure className={isPortrait ? 'mt-3 max-w-64 sm:max-w-xs' : 'mt-3'}>
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        decoding="async"
        loading="lazy"
        className="h-auto w-full rounded-lg"
        alt={alt}
      />
      {/* The caption breaks between its two credits and nowhere else. It sits
          under a narrow column, so left alone a line break lands inside "CC
          BY-SA 3.0", between a photographer's first and last name, or after
          "Photo:" — and an underline split across two lines reads as two
          separate links. Each credit keeps its label and its trailing note on
          the same line for the same reason: "(resized)" alone on a line is not
          an attribution. */}
      <figcaption className="mt-2 text-xs text-text-muted">
        {context ? `${context}. ` : null}
        <span className="whitespace-nowrap">
          Photo:{' '}
          <a
            href={creditUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
          >
            {creditName}
          </a>
          ,
        </span>{' '}
        <span className="whitespace-nowrap">
          <a
            href={licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border-strong underline-offset-4 hover:text-text"
          >
            {licenseName}
          </a>
          {modificationNote ? ` (${modificationNote})` : null}
        </span>
      </figcaption>
    </figure>
  );
}
