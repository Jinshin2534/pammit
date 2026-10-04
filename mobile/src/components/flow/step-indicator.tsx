import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type StepIndicatorProps = { current: number; total: number; testID?: string };

export function StepIndicator({ current, total, testID }: StepIndicatorProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  return (
    <View accessibilityLabel={`${safeTotal}段階中${safeCurrent}段階目`} style={styles.wrapper} testID={testID}>
      <AppText variant="caption">{safeCurrent} / {safeTotal}</AppText>
      <View style={styles.row}>
        {Array.from({ length: safeTotal }, (_, index) => (
          <View key={index} style={[styles.bar, index < safeCurrent && styles.active]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 6, paddingHorizontal: 40 },
  row: { flexDirection: 'row', gap: 8, width: '100%' },
  bar: { backgroundColor: colors.disabled, borderRadius: radii.full, flex: 1, height: 8 },
  active: { backgroundColor: colors.primary },
});
