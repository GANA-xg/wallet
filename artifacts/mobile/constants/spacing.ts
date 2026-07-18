/**
 * Vault Design System — Spacing
 * 4px grid, base unit 4px.
 * Use these values everywhere — never hardcode padding/margin/gap.
 */
const spacing = {
  /** 4px — icon gaps, micro padding */
  xs: 4,
  /** 8px — inline gaps, chip padding */
  sm: 8,
  /** 12px — tight section spacing */
  md: 12,
  /** 16px — default padding/margins */
  base: 16,
  /** 24px — section spacing */
  lg: 24,
  /** 32px — major section breaks */
  xl: 32,
  /** 48px — screen top padding */
  "2xl": 48,
  /** 64px — hero spacing */
  "3xl": 64,
} as const;

export type SpacingToken = keyof typeof spacing;
export default spacing;
