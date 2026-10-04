import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts, radii, strokes } from '@/theme/tokens';

export type CardVariant = 'outlined' | 'filled' | 'muted';

export type CardProps = {
  title?: string;
  body?: string;
  children?: ReactNode;
  variant?: CardVariant;
  testID?: string;
  style?: ViewStyle;
};

export function Card({
  title,
  body,
  children,
  variant = 'outlined',
  testID,
  style,
}: CardProps) {
  return (
    <View testID={testID} style={[styles.base, styles[variant], style]}>
      {title ? (
        <Text maxFontSizeMultiplier={1.2} style={styles.title}>
          {title}
        </Text>
      ) : null}

      {body ? (
        <Text maxFontSizeMultiplier={1.2} style={styles.body}>
          {body}
        </Text>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    borderRadius: radii.md,
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: strokes.default,
  },
  filled: {
    backgroundColor: colors.surfaceWarm,
  },
  muted: {
    backgroundColor: colors.surfaceGray,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 23,
    includeFontPadding: false,
    lineHeight: 25,
  },
  body: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 18,
  },
});
