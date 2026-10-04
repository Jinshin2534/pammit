import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { colors, radii } from '@/theme/tokens';

export type PinKeyValue = `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | 'delete';
export type PinKeyProps = { value: PinKeyValue; onPress: (value: PinKeyValue) => void; disabled?: boolean; testID?: string };

export function PinKey({ value, onPress, disabled = false, testID }: PinKeyProps) {
  const label = value === 'delete' ? '⌫' : value;
  return (
    <Pressable
      accessibilityLabel={value === 'delete' ? '1文字消す' : `${value}を入力`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(value)}
      testID={testID}
      style={({ pressed }) => [styles.key, pressed && styles.pressed, disabled && styles.disabled]}>
      <AppText variant="title">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: { alignItems: 'center', backgroundColor: colors.surfaceWarm, borderColor: colors.primary, borderRadius: radii.full, borderWidth: 2, height: 64, justifyContent: 'center', width: 64 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
});
