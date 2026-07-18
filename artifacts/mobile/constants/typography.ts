/**
 * Vault Design System — Typography
 *
 * Font: Geist (primary) or Inter (fallback) — chosen for fintech trust/premium.
 * Scale ratio: 1.25 (major third)
 *
 * Each level defines:
 * - fontSize: pixel size
 * - fontWeight: weight number
 * - lineHeight: line height ratio (unitless, multiply by fontSize)
 * - letterSpacing: tracking in em units
 */

/** Geist font family names — load via expo-font */
export const fontFamilies = {
  geist: {
    light: "Geist_300Light",
    regular: "Geist_400Regular",
    medium: "Geist_500Medium",
    semibold: "Geist_600SemiBold",
    bold: "Geist_700Bold",
    extrabold: "Geist_800ExtraBold",
  },
  /** Inter fallback — already loaded in the app */
  inter: {
    light: "Inter_300Light",
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extrabold: "Inter_800ExtraBold",
  },
} as const;

/** Typography scale — use these tokens, never hardcode font sizes */
const typography = {
  /** 36px — balance amount, hero numbers */
  hero: {
    fontSize: 36,
    fontWeight: "700" as const,
    lineHeight: 1.15,
    letterSpacing: -0.02,
  },
  /** 28px — section titles */
  h1: {
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 1.2,
    letterSpacing: -0.01,
  },
  /** 22px — card titles */
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
    lineHeight: 1.25,
    letterSpacing: -0.01,
  },
  /** 18px — subsection headers */
  h3: {
    fontSize: 18,
    fontWeight: "500" as const,
    lineHeight: 1.3,
    letterSpacing: 0,
  },
  /** 16px — primary body, transaction merchant names */
  bodyLg: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 1.5,
    letterSpacing: 0,
  },
  /** 14px — default body, transaction amounts */
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 1.5,
    letterSpacing: 0,
  },
  /** 12px — timestamps, labels, captions */
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  /** 10px — badges, tags, micro indicators */
  micro: {
    fontSize: 10,
    fontWeight: "500" as const,
    lineHeight: 1.3,
    letterSpacing: 0.02,
  },
} as const;

export type TypographyLevel = keyof typeof typography;
export default typography;
