import { Image } from 'expo-image';
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
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chevronSlot}>
          <Image
            accessible={false}
            contentFit="fill"
            source={require('../../../assets/images/admin/dropdown-chevron.svg')}
            style={styles.chevron}
          />
        </View>
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
  chevronSlot: { alignItems: 'center', height: 10, justifyContent: 'center', marginLeft: 12, width: 14 },
  chevron: { height: 7.5, transform: [{ rotate: '180deg' }], width: 12.1244 },
  // 一覧は浮かせずに入力欄の下へ並べる。浮かせるとページの高さに入らず、下の選択肢までスクロールできない
  options: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: strokes.default, overflow: 'hidden', paddingVertical: 6 },
  option: { height: 48, justifyContent: 'center', paddingHorizontal: 20 },
  optionSelected: { backgroundColor: colors.accent },
  optionText: { lineHeight: 25 },
  optionTextSelected: { color: colors.textInverse },
  placeholder: { color: colors.borderMuted },
  disabled: { backgroundColor: colors.surfaceMuted, borderColor: colors.disabled },
  pressed: { opacity: 0.7 },
});
