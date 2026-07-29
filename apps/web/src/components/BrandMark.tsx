/**
 * The brand mark: three bars descending like a timing tower, sheared -12deg to
 * echo the signature stripe.
 *
 * Authored in the Claude Design project (`assets/mark.svg`) and inlined here
 * rather than loaded as an image so it inherits `currentColor` — the mark is
 * accent-on-page in the header, but takes the surrounding colour anywhere else
 * (a disabled state, a print stylesheet) without needing a second file.
 *
 * The -12deg shear is safe here in a way it is not for `.gpp-stripe`: this is a
 * fixed 60x40 viewBox, so the displacement is bounded by the artwork rather
 * than by whatever height a container happens to be.
 */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 40"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(28 20) skewX(-12) translate(-28 -20)">
        <rect x="7" y="14" width="12" height="24" />
        <rect x="24" y="2" width="12" height="36" />
        <rect x="41" y="20" width="12" height="18" />
      </g>
    </svg>
  );
}
