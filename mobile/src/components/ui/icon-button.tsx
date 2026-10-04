import { ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';

export type IconButtonVariant = 'primary' | 'secondary' | 'plain';

export type IconButtonProps = {
  accessibilityLabel: string;
  icon: ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
};

const backgroundByVariant: Record<IconButtonVariant, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  plain: colors.surface,
};

export function IconButton({
  accessibilityLabel,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: disabled ? colors.disabled : backgroundByVariant[variant],
          borderColor: variant === 'plain' ? colors.borderMuted : 'transparent',
        },
        pressed && styles.pressed,
        style,
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
