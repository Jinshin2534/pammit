import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { ListItem } from './list-item';
import { colors, radii, strokes } from '@/theme/tokens';

export type DropdownOption = { label: string; value: string; description?: string };
export type DropdownProps = { label: string; options: readonly DropdownOption[]; value: readonly string[]; onChange: (value: string[]) => void; multiple?: boolean; placeholder?: string; disabled?: boolean; testID?: string };

export function Dropdown({ label, options, value, onChange, multiple = false, placeholder = '選んでください', disabled = false, testID }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label);
  const select = (next: string) => {
    if (multiple) onChange(value.includes(next) ? value.filter((item) => item !== next) : [...value, next]);
    else { onChange([next]); setOpen(false); }
  };
  return (
    <View style={styles.wrapper} testID={testID}>
      <AppText variant="bodyLg">{label}</AppText>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen((current) => !current)} style={({ pressed }) => [styles.field, disabled && styles.disabled, pressed && styles.pressed]} testID={testID ? `${testID}-toggle` : undefined}>
        <AppText variant="bodyLg" numberOfLines={1} style={!selectedLabels.length ? styles.placeholder : undefined}>{selectedLabels.join('・') || placeholder}</AppText>
        <AppText variant="bodyLg">{open ? '⌃' : '⌄'}</AppText>
      </Pressable>
      {open && <View accessibilityRole="list" style={styles.options}>{options.map((option) => <ListItem key={option.value} title={option.label} description={option.description} selected={value.includes(option.value)} onPress={() => select(option.value)} trailing={<AppText variant="bodyLgBold">{value.includes(option.value) ? '✓' : ''}</AppText>} testID={testID ? `${testID}-${option.value}` : undefined} />)}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch', gap: 8 }, field: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 20 }, options: { gap: 6 }, placeholder: { color: colors.textSub }, disabled: { backgroundColor: colors.surfaceMuted, borderColor: colors.disabled }, pressed: { opacity: 0.7 },
});
