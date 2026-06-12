import { Flag } from './Flag';

export function RaceFlag({
  countryCode,
  size = 'md',
  className = '',
}: {
  countryCode: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}) {
  const flagSize =
    size === 'full'
      ? 'full'
      : size === 'lg'
        ? 'xl'
        : size === 'sm'
          ? 'md'
          : 'lg';
  return <Flag code={countryCode} size={flagSize} className={className} />;
}
