import { StyleSheet, TextInput } from 'react-native';
import { colors, radii } from '@/theme/tokens';

export type ChatInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onFocus?: () => void;
  placeholder?: string;
  /** 入力もできなくする（通信が切れているときなど） */
  disabled?: boolean;
  /** 送信中。入力はそのままにし（キーボードを閉じない）、送信だけ止める */
  sending?: boolean;
  maxLength?: number;
  testID?: string;
};
export function ChatInput({ value, onChangeText, onSend, onFocus, placeholder = 'メッセージを入力', disabled = false, sending = false, maxLength, testID }: ChatInputProps) {
  return (
    <TextInput
      accessibilityLabel="相談内容"
      accessibilityState={{ disabled, busy: sending }}
      editable={!disabled}
      enterKeyHint="send"
      maxFontSizeMultiplier={1.2}
      maxLength={maxLength}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onSubmitEditing={() => !sending && !disabled && value.trim() && onSend()}
      placeholder={placeholder}
      placeholderTextColor={colors.borderMuted}
      returnKeyType="send"
      submitBehavior="submit"
      style={[styles.input, disabled && styles.disabled]}
      value={value}
      testID={testID}
    />
  );
}
const styles = StyleSheet.create({
  input: { alignSelf: 'center', backgroundColor: colors.surface, borderColor: colors.text, borderRadius: radii.md, borderWidth: 2, color: colors.text, fontFamily: 'ZenMaruGothic-Medium', fontSize: 15, height: 44, includeFontPadding: false, lineHeight: 15, paddingHorizontal: 20, paddingVertical: 0, width: '100%' },
  disabled: { backgroundColor: colors.surfaceMuted, color: colors.textSub },
});
