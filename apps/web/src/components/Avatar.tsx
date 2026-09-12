import { sizedAvatarUrl } from '@/lib/avatar';

/**
 * Initials are sized as a fraction of their circle, not from the type scale:
 * they have to fit inside a fixed round container, so they cannot simply take
 * the reading floor the rest of the app now has. What they can do is scale.
 * `h-5` is already rem-based, so authoring the type in rem too means the glyph
 * and the circle grow together when the reader raises their font size — which
 * the old bare `9px` did not do.
 */
const SIZES = {
  xs: { className: 'h-5 w-5 text-[0.625rem]', px: 20 },
  sm: { className: 'h-8 w-8 text-sm', px: 32 },
  md: { className: 'h-12 w-12 text-lg', px: 48 },
  lg: {
    className:
      'h-12 w-12 text-xl sm:h-16 sm:w-16 sm:text-2xl lg:h-20 lg:w-20 lg:text-3xl',
    px: 80,
  },
} as const;

/*
 * The initials fallback used to hash the username onto one of ten saturated
 * hues (#E67300, #DC0028, #2B5AA8...). None of them were tokens, and ten
 * loud circles down a leaderboard or members list is the same problem the
 * team-colour rule exists to prevent — colour that carries no meaning
 * competing with colour that does.
 *
 * Identity now comes from the initial itself on a neutral chip. The uploaded
 * avatar, when there is one, still carries all the personality it did before.
 */

export function Avatar({
  avatarUrl,
  username,
  size = 'md',
}: {
  avatarUrl?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const { className: sizeClass, px } = SIZES[size];
  // `||` not `??`: an empty username is as absent as a null one, and indexing
  // into '' would blow up on .toUpperCase().
  const name = username || '?';
  const initial = name[0].toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={sizedAvatarUrl(avatarUrl, px)}
        alt={username || 'User avatar'}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    // Avatars keep their circle: `rounded-full` is reserved for these and the
    // 5px team dot.
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated font-medium text-text-muted`}
    >
      {initial}
    </span>
  );
}
