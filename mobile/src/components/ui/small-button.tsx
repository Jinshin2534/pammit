import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii } from '@/theme/tokens';

export type SmallButtonVariant = 'primary' | 'soft' | 'secondary' | 'outline';

export type SmallButtonProps = {
  label: string;
  onPress: () => void;
  variant?: SmallButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: ViewStyle;
};

const backgroundByVariant: Record<SmallButtonVariant, string> = {
  primary: colors.primary,
  soft: colors.primarySoft,
  secondary: colors.secondary,
  outline: colors.surface,
};

export function SmallButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
  style,
}: SmallButtonProps) {
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';
  const isSoft = variant === 'soft';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isDisabled ? colors.disabled : backgroundByVariant[variant],
          borderColor: isOutline ? colors.primary : 'transparent',
          borderWidth: isOutline ? 2 : 0,
        },
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.textInverse} size="small" />
      ) : (
        <AppText
          variant={isSoft ? 'body' : 'caption'}
          numberOfLines={1}
          style={{
            color: isSoft ? colors.text : isOutline ? colors.primary : colors.textInverse,
            lineHeight: isSoft ? 15 : 13,
          }}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
