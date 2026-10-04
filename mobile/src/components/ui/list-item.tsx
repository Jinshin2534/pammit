import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radii } from '@/theme/tokens';

export type ListItemProps = { title: string; description?: string; leading?: ReactNode; trailing?: ReactNode; selected?: boolean; disabled?: boolean; onPress?: () => void; testID?: string };

export function ListItem({ title, description, leading, trailing, selected = false, disabled = false, onPress, testID }: ListItemProps) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected, disabled }} disabled={disabled || !onPress} onPress={onPress} testID={testID} style={({ pressed }) => [styles.item, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}>
      {leading}
      <View style={styles.copy}>
        <AppText variant="bodyLgBold">{title}</AppText>
        {description && <AppText variant="caption" style={styles.description}>{description}</AppText>}
      </View>
      {trailing ?? (onPress && <AppText variant="bodyLg">›</AppText>)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.disabled, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 64, paddingHorizontal: 16, paddingVertical: 10 },
  copy: { flex: 1 }, description: { color: colors.textSub }, selected: { backgroundColor: colors.surfaceWarm, borderColor: colors.primary, borderWidth: 3 }, pressed: { opacity: 0.7 }, disabled: { opacity: 0.45 },
});
