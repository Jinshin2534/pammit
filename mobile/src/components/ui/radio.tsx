import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radii } from '@/theme/tokens';

export type RadioProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

export function Radio({ label, selected, onPress, disabled = false, testID }: RadioProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}>
      <View style={[styles.ring, selected && styles.selectedRing]}>
        {selected && <View style={styles.dot} />}
      </View>
      <AppText variant="bodyLg">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 12, minHeight: 48 },
  ring: { alignItems: 'center', borderColor: colors.borderMuted, borderRadius: radii.full, borderWidth: 3, height: 32, justifyContent: 'center', width: 32 },
  selectedRing: { borderColor: colors.primary },
  dot: { backgroundColor: colors.primary, borderRadius: radii.full, height: 16, width: 16 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
