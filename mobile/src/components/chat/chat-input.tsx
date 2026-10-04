import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type ChatInputProps = { value: string; onChangeText: (value: string) => void; onSend: () => void; placeholder?: string; disabled?: boolean; testID?: string };
export function ChatInput({ value, onChangeText, onSend, placeholder = 'AIに相談する', disabled = false, testID }: ChatInputProps) {
  const cannotSend = disabled || !value.trim();
  return <View style={styles.row} testID={testID}><TextInput accessibilityLabel="相談内容" editable={!disabled} maxFontSizeMultiplier={1.2} multiline onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSub} style={styles.input} value={value} testID={testID ? `${testID}-input` : undefined} /><Pressable accessibilityLabel="送信" accessibilityRole="button" accessibilityState={{ disabled: cannotSend }} disabled={cannotSend} onPress={onSend} style={({ pressed }) => [styles.send, cannotSend && styles.disabled, pressed && styles.pressed]} testID={testID ? `${testID}-send` : undefined}><AppText variant="bodyBold" style={styles.sendText}>送信</AppText></Pressable></View>;
}
const styles = StyleSheet.create({ row: { alignItems: 'flex-end', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radii.md, borderWidth: 3, flexDirection: 'row', gap: 8, padding: 8 }, input: { color: colors.text, flex: 1, fontFamily: 'ZenMaruGothic-Medium', fontSize: 15, lineHeight: 22, maxHeight: 110, minHeight: 40, padding: 8 }, send: { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 10 }, disabled: { backgroundColor: colors.disabled }, pressed: { opacity: 0.7 }, sendText: { color: colors.textInverse } });
