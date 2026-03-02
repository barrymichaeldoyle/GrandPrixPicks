const SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-12 w-12 text-lg',
  lg: 'h-12 w-12 text-xl sm:h-16 sm:w-16 sm:text-2xl lg:h-20 lg:w-20 lg:text-3xl',
} as const;

const COLORS = [
  '#E67300',
  '#DC0028',
  '#2B5AA8',
  '#00A383',
  '#1A7A5A',
  '#E0569A',
  '#1E90D0',
  '#4A72CC',
  '#6B6B6B',
  '#6E7275',
];

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({
  avatarUrl,
  username,
  size = 'md',
}: {
  avatarUrl?: string | null;
  username?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = SIZES[size];
  const initial = (username ?? '?')[0].toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username ?? 'User avatar'}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ backgroundColor: hashColor(username ?? '?') }}
    >
      {initial}
    </span>
  );
}
