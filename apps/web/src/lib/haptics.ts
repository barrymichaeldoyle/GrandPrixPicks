/**
 * Haptic feedback on the web, such as it is.
 *
 * Two mechanisms, because there is no one API that works everywhere:
 *
 * - **Android** (Chrome, Firefox, Samsung Internet) supports the Vibration
 *   API. `navigator.vibrate` is a motor, not a haptic engine: it buzzes for a
 *   duration you give it, and very short values are rounded up or dropped
 *   entirely by the platform, so the taps here are 15–20ms rather than the
 *   sub-10ms a native tick would be.
 *
 * - **iOS** does not support the Vibration API in any browser, and never has —
 *   every iOS browser is WebKit, so there is no way around it by suggesting a
 *   different one. What does work is a side effect: a `<input type="checkbox"
 *   switch>` (Safari 17.4+) plays the system switch haptic when it toggles
 *   inside a user gesture. Clicking a hidden one is the whole trick, and it is
 *   what the `ios-haptics` package does. It is undocumented behaviour Apple
 *   could remove, which is exactly why it lives behind this module: when it
 *   stops working, nothing calls it any differently, it just goes quiet.
 *
 * Both paths are strictly decorative. Every caller must work with no feedback
 * at all, because that is what a desktop browser, a locked-down device, or a
 * user with system haptics switched off will get.
 *
 * The native app does not go through any of this — `expo-haptics` on mobile is
 * the real thing, with proper impact styles.
 */

/**
 * The hidden switch, built once and reused. Kept in `<head>`, which is already
 * `display: none`, so it can never be reached, focused or seen — while an
 * element hidden by a style rule can still be found by a stray selector.
 */
let iosSwitch: HTMLLabelElement | null = null;

function getIosSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (iosSwitch) {
    return iosSwitch;
  }
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  const input = document.createElement('input');
  input.type = 'checkbox';
  // Not a React prop and not in the HTML types: `switch` is a bare attribute
  // that turns a checkbox into iOS's toggle, and the haptic rides on that.
  input.setAttribute('switch', '');
  label.appendChild(input);
  document.head.appendChild(label);
  iosSwitch = label;
  return label;
}

function supportsVibrate(): boolean {
  return (
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
  );
}

/**
 * Fires the iOS switch haptic. Only worth attempting where the Vibration API
 * is missing, which on a touch device means WebKit.
 *
 * Must be called synchronously inside a user gesture: after an `await` the
 * gesture is spent and the toggle is silent. That constraint is why callers
 * fire this on the tap rather than on the response that follows it.
 */
function playIosHaptic() {
  try {
    getIosSwitch()?.click();
  } catch {
    // A haptic is never worth an exception.
  }
}

/** A single tick: one selection made, one control answered. */
export function tapHaptic() {
  if (supportsVibrate()) {
    navigator.vibrate(15);
    return;
  }
  playIosHaptic();
}

/**
 * The heavier double tap for something committed, not merely chosen — a pick
 * that reached the server.
 *
 * On iOS this is the same single switch tick as `tapHaptic`: the trick has one
 * texture and no way to ask for another. Rather than click twice and produce a
 * stutter that reads as a bug, it stays a tick there.
 */
export function successHaptic() {
  if (supportsVibrate()) {
    navigator.vibrate([12, 40, 24]);
    return;
  }
  playIosHaptic();
}
