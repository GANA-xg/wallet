/**
 * Vault Design System — Icon Tokens
 *
 * Normalize: stroke width, optical weight, sizing, padding, alignment.
 * No mixed icon styles. Use Feather consistently.
 *
 * Every icon in the app must use one of these size tokens.
 * Never hardcode size={N} on an icon component.
 */
const iconSizes = {
  /** 10px — micro dots, trend indicators */
  micro: 10,
  /** 12px — inline badges, small status indicators */
  badge: 12,
  /** 14px — small inline, disclosure chevrons, tertiary actions */
  sm: 14,
  /** 16px — standard action icons, list items, form inputs */
  md: 16,
  /** 18px — medium action icons, buttons, card actions */
  lg: 18,
  /** 20px — tab bar icons, larger action icons */
  xl: 20,
  /** 24px — back button, prominent actions */
  "2xl": 24,
  /** 32px — empty state, large status icons */
  "3xl": 32,
  /** 40px — empty state hero icons */
  hero: 40,
} as const;

export type IconSize = keyof typeof iconSizes;
export default iconSizes;
