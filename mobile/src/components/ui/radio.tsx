import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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
      {selected ? (
        <View style={styles.selected} />
      ) : (
        <Svg accessibilityElementsHidden height={30} importantForAccessibility="no-hide-descendants" width={30}>
          <Circle cx={15} cy={15} fill="none" r={11.5} stroke={colors.primary} strokeDasharray="3 6" strokeLinecap="round" strokeWidth={3} />
        </Svg>
      )}
      <AppText variant="bodyLg">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 12, minHeight: 48 },
  selected: { backgroundColor: colors.primary, borderRadius: radii.full, height: 30, width: 30 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
