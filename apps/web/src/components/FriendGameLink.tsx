import { friendGameLink } from '@/lib/navigation';

/**
 * A nod to another F1 game, in the footer's small print.
 *
 * Both footers render this — the full one and the signed-in rail's condensed
 * run — so it reaches signed-in Home as well as every public page. It stays out
 * of the picks flow deliberately: an outbound link is worth a line of small
 * print, not a slot on the surface the whole product converts on.
 *
 * See {@link friendGameLink} for why the `rel` here is missing `noreferrer`.
 */
export function FriendGameLink({ linkClassName }: { linkClassName: string }) {
  return (
    <p>
      Also playing:{' '}
      {/* Underlined, unlike the footer's other links. Those sit in nav columns
          where position marks them as links; this one is a word inside a
          sentence, and the muted-to-bright colour shift on hover is the only
          other thing distinguishing it (WCAG 1.4.1). */}
      <a
        href={friendGameLink.href}
        target="_blank"
        rel="noopener"
        className={`${linkClassName} text-text underline decoration-border underline-offset-2 hover:decoration-current`}
      >
        {friendGameLink.label}
      </a>
      , {friendGameLink.description}.
    </p>
  );
}
