/**
 * Vault Design System — Colors
 *
 * HIERARCHY:
 *   Primary Actions   → #FF385C (Rausch)
 *   Success / Money   → #0C6038 / #2E7D32
 *   Premium Features  → #754F4D (rare, luxurious)
 *   Neutral UI        → Whites, warm grays, subtle borders
 *   Warnings / Errors → #6C270A
 *
 * Brand colors (#0C6038 green, #754F4D brown) are sacred.
 * Primary green is now a SEMANTIC color — success, growth, money.
 * Primary action color is now #FF385C — recognizable, strong identity.
 *
 * Dark mode: intentionally designed. Warm blacks, warm grays, soft contrast.
 * Think Apple. Never pure black with pure white.
 */

const colors = {
  light: {
    // ── Primary Action — Rausch (#FF385C) ──
    // Use for: buttons, CTAs, active nav, active chips, selected states,
    // progress indicators, links, important interactive elements
    primary: "#FF385C",
    // Use for: pressed states only. Never as default color.
    primaryActive: "#E00B41",
    // Use for: disabled buttons, chips, actions
    primaryDisabled: "#FFD1DA",
    primaryForeground: "#FFFFFF",
    // Kept for gradient endpoints (brand → primary transition)
    primaryLight: "#FF5A7C",
    primaryLighter: "#FFE0E6",

    // ── Success — Green (#0C6038) ──
    // Use for: positive balances, money received, growth, verified
    success: "#0C6038",
    successLight: "#2E7D32",

    // ── Premium Accent — #754F4D ──
    // Use sparingly: premium features, rewards, membership, exclusive
    accent: "#754F4D",
    accentLight: "#A07876",
    accentForeground: "#FFFFFF",

    // ── Secondary (deprecated — prefer specific tokens above) ──
    secondary: "#2E7D32",
    secondaryLight: "#81C784",

    // ── Warm Surface ──
    sunset: "#F1D2A1",
    sunsetLight: "#F8E8D0",
    sunsetDark: "#D4A86A",

    // ── Semantic background layers ──
    /** Screen background — warm off-white, never pure white */
    background: "#FAFAFA",
    /** Card/sheet surface — white */
    surface: "#FFFFFF",
    /** Nested containers, secondary surfaces */
    surfaceElevated: "#F5F5F5",

    // ── Text hierarchy ──
    /** Headlines, amounts — near-black, never pure black */
    text: "#1A1A1A",
    /** Body, descriptions — warm gray */
    textSecondary: "#6B6B6B",
    /** Timestamps, hints — light gray */
    textTertiary: "#9E9E9E",

    // ── Borders ──
    /** Card edges, dividers — subtle */
    border: "#E8E8E8",
    /** Input borders — slightly stronger */
    input: "#D0D0D0",

    // ── UI states ──
    error: "#6C270A",
    warning: "#B8860B",
    destructive: "#6C270A",
    destructiveForeground: "#FFFFFF",

    // ── Legacy tokens (backward compat) ──
    card: "#FFFFFF",
    cardForeground: "#1A1A1A",
    muted: "#F5F5F5",
    mutedForeground: "#6B6B6B",
    tint: "#FF385C",

    // Semantic palette (charts, badges)
    violet: "#754F4D",
    pink: "#A07876",
    cyan: "#2E7D32",
    lime: "#81C784",
    rose: "#6C270A",
    amber: "#B8860B",
  },

  dark: {
    // ── Primary Action — lighter for dark bg contrast ──
    primary: "#FF6B85",
    primaryActive: "#FF385C",
    primaryDisabled: "#4A2030",
    primaryForeground: "#0A0A0A",
    primaryLight: "#FF385C",
    primaryLighter: "#2A1520",

    // ── Success — lighter for dark mode ──
    success: "#4CAF7D",
    successLight: "#2E7D32",

    // ── Premium Accent — lighter for dark mode ──
    accent: "#A07876",
    accentLight: "#754F4D",
    accentForeground: "#0A0A0A",

    // ── Secondary (deprecated) ──
    secondary: "#81C784",
    secondaryLight: "#2E7D32",

    // ── Warm Surface ──
    sunset: "#2D4C39",
    sunsetLight: "#1C2E23",
    sunsetDark: "#F1D2A1",

    // ── Semantic background layers ──
    /** Screen background — warm near-black, never pure black */
    background: "#0A0A0A",
    /** Card/sheet surface — warm dark gray */
    surface: "#1A1A1A",
    /** Nested containers */
    surfaceElevated: "#252525",

    // ── Text hierarchy ──
    /** Headlines, amounts — warm white, never pure white */
    text: "#F0EDE8",
    /** Body, descriptions */
    textSecondary: "#B0B0B0",
    /** Timestamps, hints */
    textTertiary: "#6B6B6B",

    // ── Borders ──
    /** Card edges, dividers — subtle on dark */
    border: "#2A2A2A",
    /** Input borders */
    input: "#3A3A3A",

    // ── UI states ──
    error: "#EF5350",
    warning: "#D4A86A",
    destructive: "#EF5350",
    destructiveForeground: "#FFFFFF",

    // ── Legacy tokens (backward compat) ──
    card: "#1A1A1A",
    cardForeground: "#F0EDE8",
    muted: "#252525",
    mutedForeground: "#B0B0B0",
    tint: "#FF6B85",

    // Semantic palette
    violet: "#A07876",
    pink: "#C49A98",
    cyan: "#4CAF7D",
    lime: "#A5D6A7",
    rose: "#EF5350",
    amber: "#D4A86A",
  },

  radius: 16,
};

export default colors;
