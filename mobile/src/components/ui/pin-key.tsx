import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { colors, radii } from '@/theme/tokens';

export type PinKeyValue = `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | 'delete' | 'submit';
export type PinKeyProps = { value: PinKeyValue; onPress: (value: PinKeyValue) => void; disabled?: boolean; testID?: string };

export function PinKey({ value, onPress, disabled = false, testID }: PinKeyProps) {
  const isDelete = value === 'delete';
  const isSubmit = value === 'submit';
  return (
    <Pressable
      accessibilityLabel={isDelete ? '1文字消す' : isSubmit ? 'PINを決定' : `${value}を入力`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(value)}
      testID={testID}
      style={({ pressed }) => [styles.key, pressed && styles.pressed, disabled && styles.disabled]}>
      {isDelete || isSubmit ? (
        <Image
          accessible={false}
          contentFit="fill"
          source={isDelete ? require('../../../assets/icons/backspace.svg') : require('../../../assets/icons/enter.svg')}
          style={styles.icon}
        />
      ) : (
        <AppText variant="title" style={styles.digit}>{value}</AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.full, height: 75, justifyContent: 'center', width: 75 },
  digit: { lineHeight: 42 },
  icon: { height: 45, width: 45 },
  pressed: { opacity: 0.7 },
  disabled: { backgroundColor: colors.disabled },
});
