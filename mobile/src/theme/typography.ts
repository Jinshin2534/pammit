import { StyleSheet } from 'react-native';

import { fonts } from './tokens';

export const typography = StyleSheet.create({
  display: { fontFamily: fonts.bold, fontSize: 55, lineHeight: 66 },
  titleLg: { fontFamily: fonts.medium, fontSize: 45, lineHeight: 58 },
  title: { fontFamily: fonts.medium, fontSize: 35, lineHeight: 51 },
  bodyLg: { fontFamily: fonts.medium, fontSize: 23, lineHeight: 30 },
  bodyLgBold: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 30 },
  bodyMd: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  captionBold: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 19 },
  small: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 15 },
  numberXl: { fontFamily: fonts.medium, fontSize: 60, lineHeight: 72 },
  numberLg: { fontFamily: fonts.bold, fontSize: 35, lineHeight: 45 },
});

export type TypographyVariant = keyof typeof typography;
