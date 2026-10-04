import { StyleSheet, TextInput } from 'react-native';
import { colors, radii } from '@/theme/tokens';

export type ChatInputProps = { value: string; onChangeText: (value: string) => void; onSend: () => void; placeholder?: string; disabled?: boolean; testID?: string };
export function ChatInput({ value, onChangeText, onSend, placeholder = 'メッセージを入力', disabled = false, testID }: ChatInputProps) {
  return (
    <TextInput
      accessibilityLabel="相談内容"
      editable={!disabled}
      enterKeyHint="send"
      maxFontSizeMultiplier={1.2}
      onChangeText={onChangeText}
      onSubmitEditing={() => value.trim() && onSend()}
      placeholder={placeholder}
      placeholderTextColor={colors.borderMuted}
      returnKeyType="send"
      style={[styles.input, disabled && styles.disabled]}
      value={value}
      testID={testID ? `${testID}-input` : testID}
    />
  );
}
const styles = StyleSheet.create({
  input: { alignSelf: 'stretch', backgroundColor: colors.surface, borderColor: colors.text, borderRadius: radii.md, borderWidth: 2, color: colors.text, fontFamily: 'ZenMaruGothic-Medium', fontSize: 15, height: 44, includeFontPadding: false, lineHeight: 15, paddingHorizontal: 20, paddingVertical: 0 },
  disabled: { backgroundColor: colors.surfaceMuted, color: colors.textSub },
});
