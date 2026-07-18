/**
 * Vault Design System — Gradients
 *
 * Use gradients ONLY for moments that deserve emphasis:
 * - Wallet card (dark)
 * - UPI banner (primary action)
 * - Rewards (premium accent)
 *
 * NEVER use gradients for ordinary buttons, inputs, or containers.
 * If a gradient doesn't feel special, it shouldn't have one.
 *
 * Primary gradient uses #FF385C (Rausch) for brand identity.
 */
const gradients = {
  /** Primary action — Rausch brand gradient */
  primary: ["#FF385C", "#E00B41"] as const,

  /** Wallet card — dark, premium */
  card: ["#2A2520", "#1A1510"] as const,

  /** UPI banner — primary action color */
  upi: ["#FF385C", "#E00B41"] as const,

  /** Rewards — premium accent */
  rewards: ["#754F4D", "#A07876"] as const,

  /** Dark surface — for dark mode cards */
  dark: ["#1A1A1A", "#0D0D0D"] as const,

  /** Warm surface — subtle warmth, rarely used */
  warm: ["#FAF7F2", "#F5F0E8"] as const,
} as const;

export default gradients;
