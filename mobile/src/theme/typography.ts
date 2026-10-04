import { StyleSheet } from 'react-native';

import { fonts } from './tokens';

export const typography = StyleSheet.create({
  display: { fontFamily: fonts.bold, fontSize: 55, lineHeight: 66 },
  titleLg: { fontFamily: fonts.medium, fontSize: 45, lineHeight: 54 },
  title: { fontFamily: fonts.medium, fontSize: 35, lineHeight: 42 },
  bodyLg: { fontFamily: fonts.medium, fontSize: 23, lineHeight: 28 },
  bodyLgBold: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 28 },
  bodyMd: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 25 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 18 },
  bodyBold: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 25 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16 },
  captionBold: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 25 },
  small: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 12 },
  numberXl: { fontFamily: fonts.medium, fontSize: 60, lineHeight: 72 },
  numberLg: { fontFamily: fonts.bold, fontSize: 35, lineHeight: 42 },
});

export type TypographyVariant = keyof typeof typography;
