import { Platform, StyleSheet } from "react-native";

/**
 * Vault Design System — Elevation
 *
 * Keep it minimal. Cards sit on backgrounds, not on shadows.
 * Prefer contrast, spacing, border, surface before using shadow.
 * Shadow should be the last tool.
 *
 * Level 0: flat on background (no shadow)
 * Level 1: subtle lift — only for selected card in wallet stack
 */
const elevation = {
  /** No shadow — default for most elements */
  none: { shadowOpacity: 0 } as const,

  /**
   * Subtle lift — only for the selected wallet card.
   * Never use for buttons, inputs, or general cards.
   */
  low: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
  }),
} as const;

export type ElevationLevel = keyof typeof elevation;
export default elevation;
