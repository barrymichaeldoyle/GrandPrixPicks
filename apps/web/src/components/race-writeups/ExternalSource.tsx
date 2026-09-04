import type { ReactNode } from 'react';

/**
 * A citation out of a write-up, to the report the claim beside it came from.
 *
 * It was defined five times, once per write-up route, character for character.
 * The reason to hold it in one place is not the twenty lines: it is that the
 * link carries an accessibility promise (the new tab is announced) and a hover
 * state, and five copies is five chances for one of them to quietly lose
 * either.
 *
 * `whitespace-nowrap` keeps a source name off two lines. These sit inside
 * reading copy at the end of a sentence, and a two-word publication broken
 * across a line reads as two separate links.
 */
export function ExternalSource({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-block font-semibold whitespace-nowrap text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
