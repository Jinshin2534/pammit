import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type ChatBubbleProps = { message: string; sender: 'ai' | 'user'; time?: string; testID?: string };
export function ChatBubble({ message, sender, time, testID }: ChatBubbleProps) {
  const ai = sender === 'ai';
  return <View style={[styles.bubble, ai ? styles.ai : styles.user]} testID={testID}><AppText variant="caption" style={[styles.message, ai && styles.aiMessage]}>{message}</AppText>{time ? <AppText variant="small" style={[styles.time, ai && styles.aiMessage]}>{time}</AppText> : null}</View>;
}
const styles = StyleSheet.create({
  bubble: { borderTopLeftRadius: radii.md, borderTopRightRadius: radii.md, paddingHorizontal: 20, paddingVertical: 16, width: 250 },
  ai: { backgroundColor: colors.primary, borderBottomRightRadius: radii.md },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft, borderBottomLeftRadius: radii.md },
  message: { lineHeight: 13 },
  aiMessage: { color: colors.textInverse },
  time: { alignSelf: 'flex-end', color: colors.textSub, marginTop: 4 },
});
