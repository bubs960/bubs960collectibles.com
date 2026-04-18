export const colors = {
  bg: '#0A0D1C',
  surface0: '#14182D',
  surface1: '#1C2141',
  surface2: '#262C54',
  border: '#2D3358',
  borderBright: '#424882',
  text: '#F5F6FA',
  muted: '#A2A7C0',
  dim: '#6B7085',
  accent: '#5B8DEF',
  accentWarm: '#F0A04B',
  accentRare: '#C4A86A',
  success: '#42D392',
  danger: '#E5484D',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const heroCollapseThreshold = 300;

export type ColorToken = keyof typeof colors;
