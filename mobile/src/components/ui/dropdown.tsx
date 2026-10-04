import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors, radii, strokes } from '@/theme/tokens';

export type DropdownOption = { label: string; value: string; description?: string };
export type DropdownProps = { label?: string; options: readonly DropdownOption[]; value: readonly string[]; onChange: (value: string[]) => void; multiple?: boolean; placeholder?: string; disabled?: boolean; testID?: string };

export function Dropdown({ label, options, value, onChange, multiple = false, placeholder = '選んでください', disabled = false, testID }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label);
  const select = (next: string) => {
    if (multiple) onChange(value.includes(next) ? value.filter((item) => item !== next) : [...value, next]);
    else { onChange([next]); setOpen(false); }
  };
  return (
    <View style={styles.wrapper} testID={testID}>
      {label ? <AppText variant="bodyLg" style={styles.label}>{label}</AppText> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen((current) => !current)} style={({ pressed }) => [styles.field, disabled && styles.disabled, pressed && styles.pressed]} testID={testID ? `${testID}-toggle` : undefined}>
        <AppText variant="bodyLg" numberOfLines={1} style={[styles.fieldText, !selectedLabels.length ? styles.placeholder : undefined]}>{selectedLabels.join(' / ') || placeholder}</AppText>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.chevron, open && styles.chevronOpen]} />
      </Pressable>
      {open ? (
        <View accessibilityRole="list" style={styles.options}>
          {options.map((option) => {
            const selected = value.includes(option.value);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => select(option.value)}
                style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
                testID={testID ? `${testID}-${option.value}` : undefined}>
                <AppText variant="bodyLg" numberOfLines={1} style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch', gap: 6 },
  label: { lineHeight: 25, marginBottom: 2 },
  field: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, flexDirection: 'row', height: 58, justifyContent: 'space-between', overflow: 'hidden', paddingHorizontal: 20 },
  fieldText: { flex: 1, lineHeight: 25 },
  chevron: { borderLeftColor: 'transparent', borderLeftWidth: 6, borderRightColor: 'transparent', borderRightWidth: 6, borderTopColor: colors.primary, borderTopWidth: 8, height: 0, marginLeft: 12, width: 0 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  options: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, overflow: 'hidden', paddingVertical: 6 },
  option: { height: 48, justifyContent: 'center', paddingHorizontal: 20 },
  optionSelected: { backgroundColor: colors.accent },
  optionText: { lineHeight: 25 },
  optionTextSelected: { color: colors.textInverse },
  placeholder: { color: colors.borderMuted },
  disabled: { backgroundColor: colors.surfaceMuted, borderColor: colors.disabled },
  pressed: { opacity: 0.7 },
});
