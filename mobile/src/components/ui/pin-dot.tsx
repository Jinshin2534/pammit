import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';

export type PinDotProps = { filled: boolean; testID?: string };

export function PinDot({ filled, testID }: PinDotProps) {
  return (
    <View
      accessibilityLabel={filled ? '入力済み' : '未入力'}
      style={[styles.dot, filled && styles.filled]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  dot: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.full, borderWidth: 3, height: 24, width: 24 },
  filled: { backgroundColor: colors.primary },
});
