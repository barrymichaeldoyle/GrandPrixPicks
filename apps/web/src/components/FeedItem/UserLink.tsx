import { Link } from '@tanstack/react-router';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';

export function UserLink({
  username,
  displayName,
}: {
  username?: string;
  displayName?: string;
}) {
  const name = resolveDisplayName({ displayName, username });
  if (!username) {
    return <span className="font-semibold text-text">{name}</span>;
  }
  return (
    <Link
      to="/p/$username"
      params={{ username }}
      search={{ from: undefined, fromLabel: undefined }}
      className="font-bold text-accent hover:text-accent-hover"
    >
      {name}
    </Link>
  );
}
