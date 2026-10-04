import { ReactNode } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';

export type IconButtonIcon = 'back' | 'forward' | 'plus' | 'minus';
export type IconButtonVariant = 'primary' | 'secondary' | 'plain';

export type IconButtonProps = {
  accessibilityLabel: string;
  icon?: IconButtonIcon | ReactNode;
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

function Icon({ icon }: { icon: IconButtonIcon | ReactNode }) {
  if (typeof icon !== 'string') return <>{icon}</>;
  if (icon === 'plus' || icon === 'minus') {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.symbol}>
        <View style={styles.horizontalBar} />
        {icon === 'plus' ? <View style={styles.verticalBar} /> : null}
      </View>
    );
  }

  return (
    <Image
      accessible={false}
      contentFit="fill"
      source={require('../../../assets/icons/chevron-left.svg')}
      style={[styles.chevron, icon === 'forward' && styles.forward]}
    />
  );
}

export function IconButton({ accessibilityLabel, icon = 'back', onPress, variant = 'primary', disabled = false, testID, style }: IconButtonProps) {
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
      <Icon icon={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: radii.full, height: 48, justifyContent: 'center', overflow: 'hidden', width: 48 },
  chevron: { height: 59, width: 59 },
  forward: { transform: [{ rotate: '180deg' }] },
  symbol: { height: 24, position: 'relative', width: 24 },
  horizontalBar: { backgroundColor: colors.textInverse, borderRadius: 1.5, height: 3, left: 3, position: 'absolute', top: 10.5, width: 18 },
  verticalBar: { backgroundColor: colors.textInverse, borderRadius: 1.5, height: 18, left: 10.5, position: 'absolute', top: 3, width: 3 },
  pressed: { opacity: 0.7 },
});
