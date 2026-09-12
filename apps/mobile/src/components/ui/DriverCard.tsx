import { displayTeamName, getTeamColor } from '../../lib/teamColors';
import { useTypography } from '../../theme/typography';
import { Modal, Pressable, Text, View } from '../../tw';
import { NationalityFlag } from './FlagImage';

/** Who a driver chip stands for. Every field but the code can be missing. */
export type DriverIdentity = {
  code: string;
  displayName?: string | null;
  number?: number | null;
  team?: string | null;
  nationality?: string | null;
};

/** Whether there is anything to say beyond the three letters already on screen. */
export function hasDriverDetail(driver: DriverIdentity): boolean {
  return (
    driver.displayName != null ||
    driver.number != null ||
    driver.team != null ||
    driver.nationality != null
  );
}

/**
 * The driver profile card, opened by tapping a chip.
 *
 * The same card web shows on hover: the number and code in their own block,
 * then the flag, the name and the team. Mobile has no hover, so the tap is the
 * gesture and this is a modal rather than a tooltip — but it is deliberately
 * the tooltip's layout and nothing more. It answers "who is BOR", which is the
 * only question a three-letter code raises, and it is not a profile screen.
 *
 * Anywhere on the scrim dismisses. There is no button to close and no action
 * inside: a card that can only be read should not make you find its exit.
 */
export function DriverCard({
  driver,
  onDismiss,
}: {
  driver: DriverIdentity | null;
  onDismiss: () => void;
}) {
  const { numeralFontFamily } = useTypography();
  const mono = numeralFontFamily ? { fontFamily: numeralFontFamily } : null;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={driver !== null}
    >
      <Pressable
        accessibilityLabel="Close driver card"
        accessibilityRole="button"
        className="flex-1 items-center justify-center px-8"
        onPress={onDismiss}
        /* The scrim is an inline colour, not `bg-black/70`: the slash-opacity
           utility does not resolve against this app's palette, so the class
           painted nothing and the card floated over an undimmed screen. */
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        {driver ? (
          <View className="relative flex-row overflow-hidden rounded-md border border-border bg-surface">
            <View
              className="absolute top-0 bottom-0 left-0 w-[3px]"
              style={{ backgroundColor: getTeamColor(driver.team) }}
            />
            {/* Number over code, the block web gives them. Plain surface, not
                a team-coloured tile: the colour is the 3px bar and nothing
                else. */}
            <View className="w-20 items-center justify-center gap-1 border-r border-border py-4 pl-1">
              {driver.number != null ? (
                <Text
                  className="text-foreground text-2xl leading-none font-medium"
                  style={mono}
                >
                  {driver.number}
                </Text>
              ) : null}
              <Text
                className="text-muted text-xs leading-none tracking-wide uppercase"
                style={mono}
              >
                {driver.code}
              </Text>
            </View>

            <View className="justify-center gap-1.5 px-4 py-3">
              <View className="flex-row items-center gap-2">
                {driver.nationality ? (
                  <NationalityFlag code={driver.nationality} />
                ) : null}
                {driver.displayName ? (
                  <Text className="text-foreground text-base font-medium">
                    {driver.displayName}
                  </Text>
                ) : null}
              </View>
              {driver.team ? (
                <View className="flex-row items-center gap-1.5">
                  {/* 5px dot, the team colour's only other permitted form. */}
                  <View
                    className="h-[5px] w-[5px] rounded-full"
                    style={{ backgroundColor: getTeamColor(driver.team) }}
                  />
                  <Text className="text-muted text-xs">
                    {displayTeamName(driver.team)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}
