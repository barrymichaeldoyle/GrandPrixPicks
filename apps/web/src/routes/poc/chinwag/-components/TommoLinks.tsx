import { XLogoIcon } from '@/components/ShareOnXButton';

/**
 * Tommo's own accounts, taken from the footer of tommccluskey.co.uk and his
 * video descriptions.
 *
 * The reason this is on a poll page: his audience is split across platforms and
 * the poll is the one thing all of them open. Someone who found the Chinwag on
 * YouTube has no reason to know he is on X, and the person who saw the link in a
 * tweet may never have watched an episode. A vote is the moment they are already
 * on his page with nothing else to do.
 *
 * One quiet row, every platform at the same weight. This started as two filled
 * crimson buttons for YouTube and Spotify over an icon row, which turned the end
 * of the page into an advert: the loudest thing on a page whose whole pitch is
 * that it asks nothing. Levelling them also stops the page ranking his channels
 * for him, which is not ours to do.
 *
 * Every link opens in a new tab. This page is built to be embedded, and inside
 * an iframe a plain link navigates the frame rather than the tab, which would
 * leave his site showing YouTube in a box.
 */

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
    >
      <rect height="18" rx="5" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.25" cy="6.75" fill="currentColor" r="1" stroke="none" />
    </svg>
  );
}

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M4.3 2.25 2.25 6.02v13.1h4.5v2.63h2.53l2.62-2.63h3.75L21 14.77V2.25zm14.83 11.77-2.63 2.63h-4.5l-2.62 2.62v-2.62H5.62V3.94h13.51zM15.19 7.3v4.7h-1.69V7.3zm-4.5 0v4.7H9V7.3z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M16.5 2.25h-3v13.06a2.81 2.81 0 1 1-2.06-2.71v-3.06a5.87 5.87 0 1 0 5.06 5.81V9.4a7.1 7.1 0 0 0 4.13 1.32V7.66A4.13 4.13 0 0 1 16.5 3.5z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M23.5 6.9a3 3 0 0 0-2.1-2.1C19.5 4.3 12 4.3 12 4.3s-7.5 0-9.4.5A3 3 0 0 0 .5 6.9C0 8.8 0 12 0 12s0 3.2.5 5.1a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.1.5-5.1s0-3.2-.5-5.1M9.6 15.6V8.4l6.3 3.6z" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2.25A9.75 9.75 0 1 0 21.75 12 9.76 9.76 0 0 0 12 2.25m4.47 14.06a.61.61 0 0 1-.84.2c-2.29-1.4-5.18-1.72-8.58-.94a.61.61 0 1 1-.27-1.19c3.72-.85 6.91-.48 9.49 1.09a.61.61 0 0 1 .2.84m1.19-2.65a.76.76 0 0 1-1.05.25c-2.62-1.61-6.62-2.08-9.72-1.14a.76.76 0 1 1-.44-1.46c3.54-1.08 7.95-.55 10.96 1.3a.76.76 0 0 1 .25 1.05m.1-2.76c-3.14-1.87-8.33-2.04-11.33-1.13a.92.92 0 1 1-.53-1.76c3.44-1.04 9.17-.84 12.79 1.3a.92.92 0 0 1-.93 1.59" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  {
    href: 'https://www.youtube.com/@TommoMcCluskey',
    icon: <YouTubeIcon className="h-4 w-4" />,
    label: 'YouTube',
    title: 'Tommo McCluskey on YouTube',
  },
  {
    // `Tommo's Race Chinwag`, which is this poll's show.
    href: 'https://open.spotify.com/show/09RI2C2WyVwR02wYTXCDMR',
    icon: <SpotifyIcon className="h-4 w-4" />,
    label: 'Spotify',
    title: "Tommo's Race Chinwag on Spotify",
  },
  {
    href: 'https://x.com/TommoMcCluskey',
    icon: <XLogoIcon className="h-4 w-4" />,
    label: 'X',
    title: 'Tommo McCluskey on X',
  },
  {
    href: 'https://www.instagram.com/tommomccluskey/',
    icon: <InstagramIcon className="h-4 w-4" />,
    label: 'Instagram',
    title: 'Tommo McCluskey on Instagram',
  },
  {
    // Not on his own website's link row, but in every YouTube description.
    href: 'https://www.twitch.tv/TommoLIVE',
    icon: <TwitchIcon className="h-4 w-4" />,
    label: 'Twitch',
    title: 'Tommo McCluskey on Twitch',
  },
  {
    href: 'https://www.tiktok.com/@tommomccluskey',
    icon: <TikTokIcon className="h-4 w-4" />,
    label: 'TikTok',
    title: 'Tommo McCluskey on TikTok',
  },
] as const;

export function TommoLinks() {
  return (
    <section className="mt-10 text-center">
      <h2 className="text-xs tracking-[0.12em] text-[var(--chinwag-ink-muted)] uppercase">
        More from Tommo
      </h2>
      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {SOCIAL_LINKS.map((link) => (
          <li key={link.href}>
            <a
              className="flex h-9 items-center gap-2 rounded-sm border border-[var(--chinwag-border)] bg-[var(--chinwag-card)] px-3 text-sm text-[var(--chinwag-ink)] hover:border-[var(--chinwag-coral)]"
              href={link.href}
              rel="noopener"
              target="_blank"
              title={link.title}
            >
              {link.icon}
              <span>{link.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
