export type WriteUpNewsPhotoProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  creditName: string;
  creditUrl: string;
  licenseName: string;
  licenseUrl: string;
  modificationNote?: string;
};

/** Write-up news photo with the house CC attribution caption. */
export function WriteUpNewsPhoto({
  src,
  alt,
  width,
  height,
  creditName,
  creditUrl,
  licenseName,
  licenseUrl,
  modificationNote,
}: WriteUpNewsPhotoProps) {
  return (
    <figure className="mt-3">
      <img
        src={src}
        width={width}
        height={height}
        decoding="async"
        loading="lazy"
        className="h-auto w-full rounded-sm"
        alt={alt}
      />
      <figcaption className="mt-2 text-xs text-text-muted">
        Photo:{' '}
        <a
          href={creditUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          {creditName}
        </a>
        ,{' '}
        <a
          href={licenseUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-border-strong underline-offset-4 hover:text-text"
        >
          {licenseName}
        </a>
        {modificationNote ? ` (${modificationNote})` : null}
        {modificationNote ? ` (${modificationNote})` : null}
      </figcaption>
    </figure>
  );
}
