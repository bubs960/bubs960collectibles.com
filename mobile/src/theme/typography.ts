import { TextStyle } from 'react-native';

export const fonts = {
  display: 'BebasNeue-Regular',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodyBold: 'Inter-Bold',
} as const;

export const type = {
  h1: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
  },
  heroPrice: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;
