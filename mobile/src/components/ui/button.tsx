import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, fonts, radii } from '@/theme/tokens';

export type ButtonVariant = 'cta' | 'primary' | 'secondary';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
};

const backgroundByVariant: Record<ButtonVariant, string> = {
  cta: colors.cta,
  primary: colors.primary,
  secondary: colors.secondary,
};

export function Button({
  label,
  onPress,
  variant = 'cta',
  size = 'md',
  disabled = false,
  loading = false,
  testID,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'md' ? styles.md : styles.lg,
        { backgroundColor: isDisabled ? colors.disabled : backgroundByVariant[variant] },
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.textInverse} />
      ) : (
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.full,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  md: {
    height: 48,
    width: 152,
  },
  lg: {
    alignSelf: 'stretch',
    height: 58,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.textInverse,
    fontFamily: fonts.medium,
    fontSize: 23,
    includeFontPadding: false,
    lineHeight: 25,
    textAlign: 'center',
  },
});
