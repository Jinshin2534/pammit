import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii } from '@/theme/tokens';

export type SmallButtonVariant = 'primary' | 'secondary' | 'outline';

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
        },
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.textInverse} size="small" />
      ) : (
        <AppText variant="captionBold" numberOfLines={1} style={{ color: isOutline ? colors.primary : colors.textInverse }}>
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
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
