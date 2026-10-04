import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type PammitLogoProps = { compact?: boolean; testID?: string };

export function PammitLogo({ compact = false, testID }: PammitLogoProps) {
  return (
    <View accessibilityLabel="パミット" style={styles.logo} testID={testID}>
      <View style={[styles.mark, compact && styles.compactMark]}>
        <View style={styles.leafLeft} />
        <View style={styles.leafRight} />
        <View style={styles.fruit} />
      </View>
      <AppText variant={compact ? 'bodyLgBold' : 'titleLg'} style={styles.name}>パミット</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', gap: 8 },
  mark: { height: 72, position: 'relative', width: 88 },
  compactMark: { marginBottom: -10, transform: [{ scale: 0.72 }] },
  fruit: { backgroundColor: colors.accent, borderRadius: radii.full, bottom: 0, height: 50, left: 19, position: 'absolute', width: 50 },
  leafLeft: { backgroundColor: colors.primary, borderBottomLeftRadius: radii.full, borderTopRightRadius: radii.full, height: 28, left: 10, position: 'absolute', top: 0, transform: [{ rotate: '18deg' }], width: 38 },
  leafRight: { backgroundColor: colors.primarySoft, borderBottomRightRadius: radii.full, borderTopLeftRadius: radii.full, height: 26, position: 'absolute', right: 8, top: 6, transform: [{ rotate: '-18deg' }], width: 36 },
  name: { color: colors.textDeep },
});
