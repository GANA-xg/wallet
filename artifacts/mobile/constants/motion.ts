/**
 * Vault Design System — Motion
 *
 * Motion should be almost invisible. If users notice the animation,
 * it's probably too much. Motion supports the interaction,
 * it never becomes the interaction.
 *
 * Durations based on Apple HIG.
 * Easings based on Material Motion.
 */

/** Duration tokens in milliseconds */
export const durations = {
  /** 100ms — button press feedback, opacity toggle (hide balance) */
  instant: 100,
  /** 200ms — tab transitions, chip select, filter toggle */
  fast: 200,
  /** 320ms — screen transitions, card expand, sheet open */
  normal: 320,
  /** 420ms — complex choreography, card enter/exit */
  slow: 420,
  /** 600ms — hero balance reveal, special moments */
  dramatic: 600,
} as const;

/** Easing curves — cubic-bezier values */
export const easings = {
  /** Most UI transitions */
  default: [0.4, 0, 0.2, 1] as const,
  /** Elements entering screen */
  decelerate: [0.0, 0, 0.2, 1] as const,
  /** Elements leaving screen */
  accelerate: [0.4, 0, 1, 1] as const,
} as const;

/** Spring configs for react-native-reanimated */
export const springs = {
  /** Interactive: card tap, button press, toggle */
  default: { damping: 30, stiffness: 500, mass: 1 } as const,
  /** Gentle: list item enter, shimmer stop */
  gentle: { damping: 25, stiffness: 300, mass: 1 } as const,
} as const;

/**
 * Reduced motion: all durations become 0.
 * Scale animations removed.
 * Opacity-only transitions preserved.
 */
export const reducedMotion = {
  duration: 0,
} as const;

const motion = { durations, easings, springs, reducedMotion };
export default motion;
