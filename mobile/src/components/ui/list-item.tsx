import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { AppText } from './app-text';
import type { TypographyVariant } from '@/theme/typography';
import { colors, radii } from '@/theme/tokens';

export type ListItemProps = { title: string; description?: string; leading?: ReactNode; trailing?: ReactNode; selected?: boolean; disabled?: boolean; onPress?: () => void; showChevron?: boolean; contentAlign?: 'start' | 'center'; /** 既定は bodyLg */ titleVariant?: TypographyVariant; /** 1行に収まらないときは文字を縮める */ fitTitle?: boolean; style?: ViewStyle; testID?: string };

export function ListItem({ title, description, leading, trailing, selected = false, disabled = false, onPress, showChevron = false, contentAlign = 'start', titleVariant = 'bodyLg', fitTitle = false, style, testID }: ListItemProps) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected, disabled }} disabled={disabled || !onPress} onPress={onPress} testID={testID} style={({ pressed }) => [styles.item, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled, style]}>
      {leading}
      <View style={[styles.copy, contentAlign === 'center' && styles.centeredCopy]}>
        <AppText variant={titleVariant} numberOfLines={fitTitle ? 1 : undefined} adjustsFontSizeToFit={fitTitle} style={[styles.title, contentAlign === 'center' && styles.centeredTitle, selected && styles.selectedText]}>{title}</AppText>
        {description && <AppText variant="caption" style={[styles.description, selected && styles.selectedText]}>{description}</AppText>}
      </View>
      {trailing ?? (onPress && showChevron && <AppText variant="bodyLg">›</AppText>)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: 4, flexDirection: 'row', gap: 12, height: 58, paddingHorizontal: 20, paddingVertical: 13 },
  copy: { flex: 1 },
  centeredCopy: { alignItems: 'center' },
  title: { lineHeight: 25 },
  centeredTitle: { textAlign: 'center' },
  description: { color: colors.textSub, lineHeight: 13 },
  selected: { backgroundColor: colors.accent },
  selectedText: { color: colors.textInverse },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
