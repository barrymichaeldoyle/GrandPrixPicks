import { listGuideMeta } from '@/lib/guideMeta';
import { listRaceWriteups } from '@/lib/raceWriteups';

type PaletteGroup = 'Picks' | 'Go to' | 'Write-ups' | 'Guides';

/** Groups render in this order, and only when they have a match. */
const PALETTE_GROUP_ORDER: readonly PaletteGroup[] = [
  'Picks',
  'Go to',
  'Write-ups',
  'Guides',
];

export type PaletteCommand = {
  id: string;
  /**
   * Read on its own in a list, so it names the destination rather than
   * describing it ("Leaderboard", not "See the leaderboard").
   */
  label: string;
  group: PaletteGroup;
  href: string;
  /**
   * Words a player might type that are not in the label. "standings" for the
   * leaderboard, "friends" for leagues — the vocabulary the site does not use
   * but the person searching might.
   */
  keywords?: readonly string[];
  /**
   * Needs a viewer. A signed-out visitor gets a sign-in prompt on these rather
   * than the page, so offering them is offering a detour — see
   * {@link buildCommands}.
   */
  viewerOnly?: boolean;
};

/**
 * Every destination that is a page, in bar order first and then the rest.
 *
 * `/me` redirects to the signed-in user's profile, which is why the palette can
 * carry a profile entry without knowing the username.
 */
const STATIC_COMMANDS: readonly PaletteCommand[] = [
  { id: 'home', label: 'Home', group: 'Go to', href: '/' },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    group: 'Go to',
    href: '/leaderboard',
    keywords: ['standings', 'season', 'weekend', 'points', 'rank'],
  },
  {
    id: 'leagues',
    label: 'Leagues',
    group: 'Go to',
    href: '/leagues',
    keywords: ['private', 'friends', 'mates', 'invite'],
  },
  {
    id: 'league-create',
    viewerOnly: true,
    label: 'Create a league',
    group: 'Go to',
    href: '/leagues/create',
    keywords: ['new', 'start'],
  },
  {
    id: 'races',
    label: 'Race calendar',
    group: 'Go to',
    href: '/races',
    keywords: ['schedule', 'season', 'rounds', 'fixtures'],
  },
  {
    id: 'feed',
    viewerOnly: true,
    label: 'Activity feed',
    group: 'Go to',
    href: '/feed',
    keywords: ['reactions', 'following'],
  },
  {
    id: 'notifications',
    viewerOnly: true,
    label: 'Notifications',
    group: 'Go to',
    href: '/notifications',
    keywords: ['alerts', 'bell', 'unread'],
  },
  {
    id: 'profile',
    viewerOnly: true,
    label: 'My profile',
    group: 'Go to',
    href: '/me',
    keywords: ['followers', 'following', 'username'],
  },
  {
    id: 'settings',
    viewerOnly: true,
    label: 'Settings',
    group: 'Go to',
    href: '/settings',
    keywords: ['account', 'timezone', 'email', 'push', 'delete'],
  },
  {
    id: 'standings',
    label: 'F1 championship standings',
    group: 'Go to',
    href: '/f1-standings',
    keywords: ['drivers', 'constructors', 'championship', 'points'],
  },
  {
    id: 'teammate-battles',
    label: 'Team mate battles',
    group: 'Go to',
    href: '/f1-team-mate-battles',
    keywords: ['h2h', 'head to head', 'duels', 'qualifying'],
  },
  {
    id: 'pricing',
    label: 'Season Pass',
    group: 'Go to',
    href: '/pricing',
    keywords: ['billing', 'upgrade', 'plan', 'pro', 'price'],
  },
  {
    id: 'how-to-play',
    label: 'How to play',
    group: 'Guides',
    href: '/how-to-play',
    keywords: ['scoring', 'rules', 'points', 'help'],
  },
];

/**
 * The next race, worded as the thing the player came to do.
 *
 * Absent when there is no upcoming race — between the last round and the next
 * season there is nothing to pick, and an entry pointing at a page that says so
 * is worse than no entry.
 */
export function raceCommand(
  race: { name: string; slug: string } | null | undefined,
): PaletteCommand | null {
  if (!race) {
    return null;
  }

  return {
    id: `race-${race.slug}`,
    label: `Pick your ${race.name} top 5`,
    group: 'Picks',
    href: `/races/${race.slug}`,
    keywords: ['picks', 'predictions', 'top 5', 'next race', race.slug],
  };
}

/**
 * The weekend write-ups, from the registry that also drives the sitemap and the
 * in-app links. They are the pages that turn over most often, so leaving them
 * out made the palette quietly stale against the site it searches.
 *
 * `label` rather than `cta` because the group heading already supplies the verb
 * — "Read the Madrid Grand Prix predictions" under a "Write-ups" heading says
 * "read" twice.
 */
function writeupCommands(): PaletteCommand[] {
  return listRaceWriteups().map((writeup) => ({
    id: `writeup-${writeup.raceSlug}`,
    label: writeup.label,
    group: 'Write-ups' as const,
    href: writeup.to,
    keywords: ['write-up', 'preview', 'predictions', writeup.raceSlug],
  }));
}

/** Guides come from the same registry the sitemap and `/guides` read. */
function guideCommands(): PaletteCommand[] {
  return listGuideMeta().map((guide) => ({
    id: `guide-${guide.slug}`,
    label: guide.title,
    group: 'Guides' as const,
    href: `/guides/${guide.slug}`,
  }));
}

/**
 * The list for this viewer.
 *
 * Signed-out visitors get the public site and nothing else. The next race stays
 * in for them on purpose: the race page server-renders for logged-out visitors
 * and takes a pick before asking for an account, so it is a real destination
 * rather than a sign-in wall wearing a label.
 */
export function buildCommands(
  race: { name: string; slug: string } | null | undefined,
  { signedIn }: { signedIn: boolean },
): PaletteCommand[] {
  const next = raceCommand(race);
  const destinations = signedIn
    ? STATIC_COMMANDS
    : STATIC_COMMANDS.filter((command) => !command.viewerOnly);

  return [
    ...(next ? [next] : []),
    ...destinations,
    ...writeupCommands(),
    ...guideCommands(),
  ];
}

/**
 * Match rank, lowest first. A label match always beats a keyword match, and a
 * prefix always beats a match in the middle, so typing "le" puts Leaderboard
 * and Leagues above "Pick your Singapore Grand Prix top 5".
 */
const NO_MATCH = Number.POSITIVE_INFINITY;

function rank(command: PaletteCommand, query: string): number {
  const label = command.label.toLowerCase();

  if (label.startsWith(query)) {
    return 0;
  }
  // A match at a word boundary reads as a prefix to the person typing it:
  // "cal" should find "Race calendar".
  if (label.includes(` ${query}`)) {
    return 1;
  }
  if (label.includes(query)) {
    return 2;
  }
  if (command.keywords?.some((keyword) => keyword.includes(query))) {
    return 3;
  }
  return NO_MATCH;
}

/**
 * Filter and order, preserving the manifest's order inside a rank so the list
 * does not reshuffle under the cursor as the query grows.
 *
 * An empty query returns everything in manifest order: the palette opens on the
 * full list rather than on an empty panel.
 */
export function filterCommands(
  commands: readonly PaletteCommand[],
  rawQuery: string,
): PaletteCommand[] {
  const query = rawQuery.trim().toLowerCase();

  if (query === '') {
    return [...commands];
  }

  return commands
    .map((command, index) => ({ command, index, rank: rank(command, query) }))
    .filter((entry) => entry.rank !== NO_MATCH)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.command);
}

/** The visible list, grouped, in {@link PALETTE_GROUP_ORDER}. */
export function groupCommands(commands: readonly PaletteCommand[]) {
  return PALETTE_GROUP_ORDER.map((group) => ({
    group,
    commands: commands.filter((command) => command.group === group),
  })).filter((section) => section.commands.length > 0);
}
