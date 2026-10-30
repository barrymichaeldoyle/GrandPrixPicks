/**
 * Rejects usernames and display names that are slurs or abuse.
 *
 * Names are the one piece of free text one player can show another (App
 * Store guideline 1.2 asks for a filter on exactly that), so the same check
 * runs where a name is chosen, on web and mobile, and in the backend that
 * stores it. It is deliberately blunt: a short list of words nobody needs in a
 * name, matched after undoing the usual disguises. Anything subtler is what
 * "Report player" is for.
 */

/**
 * Matched anywhere in the name once separators are removed, so `f_u_c_k` and
 * `xfuckx` both count. Only words that are not inside ordinary words belong
 * here.
 */
const ANYWHERE = [
  'fuck',
  'shit',
  'cunt',
  'nigg',
  'faggot',
  'retard',
  'whore',
  'slut',
  'bitch',
  'rapist',
  'nazi',
  'hitler',
  'tranny',
  'wank',
  'twat',
  'asshole',
  'penis',
  'vagina',
  'porn',
  'pussy',
  'jizz',
  'killyourself',
];

/**
 * Matched only as a whole word, because each is also part of an ordinary one:
 * "cockpit", "analysis", "Sussex", "spice", "Dickinson".
 */
const WHOLE_WORD = new Set([
  'ass',
  'cock',
  'dick',
  'cum',
  'tits',
  'anal',
  'sex',
  'rape',
  'spic',
  'chink',
  'kike',
  'dyke',
  'fag',
  'kys',
]);

/** Shown wherever a name is refused. */
export const NAME_REJECTED_MESSAGE = "That name isn't allowed. Choose another.";

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

function unLeet(text: string): string {
  return text.replace(/[013457@$!]/g, (char) => LEET[char] ?? char);
}

/** "fuuuck" → "fuck". Only compared against terms with no doubled letter. */
function collapseRepeats(text: string): string {
  return text.replace(/(.)\1+/g, '$1');
}

export function isObjectionableName(name: string): boolean {
  const lower = name.toLowerCase();
  const compact = unLeet(lower).replace(/[^a-z]/g, '');
  const collapsed = collapseRepeats(compact);

  for (const term of ANYWHERE) {
    if (compact.includes(term)) {
      return true;
    }
    if (collapseRepeats(term) === term && collapsed.includes(term)) {
      return true;
    }
  }

  // Words are split before the leet pass, so "4ss" is caught but a digit
  // between two words still separates them.
  return lower
    .split(/[^a-z0-9@$!]+/)
    .some((word) => WHOLE_WORD.has(unLeet(word).replace(/[^a-z]/g, '')));
}
