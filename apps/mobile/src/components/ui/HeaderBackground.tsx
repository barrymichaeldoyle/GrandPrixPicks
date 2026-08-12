import { View } from '../../tw';

/**
 * Header background: the page colour and a hairline bottom border, nothing
 * else.
 *
 * This used to be a port of an older web header, with an accent sheen fading
 * down the bar and a glowing 2px accent rail across the top. The web removed
 * both, on the grounds that they were decoration in empty space, and the
 * reskin left mobile behind. Worse, when the accent changed from teal to
 * chartreuse the same opacities went from a whisper to a shout: this direction
 * spends the accent rarely, and a permanent wash across the header is the
 * opposite of rarely.
 */
export function HeaderBackground() {
  return <View className="flex-1 border-b border-border bg-page" />;
}
