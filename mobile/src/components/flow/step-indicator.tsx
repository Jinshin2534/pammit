import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type StepIndicatorProps = { current: number; total: number; testID?: string };

export function StepIndicator({ current, total, testID }: StepIndicatorProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  return (
    <View accessibilityLabel={`${safeTotal}段階中${safeCurrent}段階目`} style={styles.wrapper} testID={testID}>
      <View style={styles.line} />
      <View style={styles.row}>
        {Array.from({ length: safeTotal }, (_, index) => (
          <View key={index} style={[styles.dot, index + 1 === safeCurrent && styles.current]}>
            <AppText
              variant="bodyLg"
              style={[styles.number, index + 1 === safeCurrent && styles.currentNumber]}>
              {index + 1}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 42, position: 'relative', width: 295 },
  line: { backgroundColor: colors.surface, height: 3, left: 21, position: 'absolute', right: 21, top: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  dot: { alignItems: 'center', backgroundColor: colors.disabled, borderRadius: radii.full, height: 42, justifyContent: 'center', width: 42 },
  current: { backgroundColor: colors.accent },
  number: { lineHeight: 25, textAlign: 'center' },
  currentNumber: { color: colors.textInverse },
});
