/**
 * Vault Design System — Border Radius
 * Minimal system: 8, 12, 16, full. Nothing else unless absolutely necessary.
 * Consistency creates quality.
 */
const radius = {
  /** 8px — inputs, chips, small cards */
  sm: 8,
  /** 12px — standard cards, icon containers */
  md: 12,
  /** 16px — bottom sheets, modals, buttons */
  lg: 16,
  /** 9999px — pills, avatars, badges, toggle tracks */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
export default radius;
