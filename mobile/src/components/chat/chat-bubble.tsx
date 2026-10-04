import { StyleSheet, View } from 'react-native';
import { AiAvatar } from './ai-avatar';
import { AppText } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

export type ChatBubbleProps = { message: string; sender: 'ai' | 'user'; time?: string; testID?: string };
export function ChatBubble({ message, sender, time, testID }: ChatBubbleProps) {
  const ai = sender === 'ai';
  return <View style={[styles.row, !ai && styles.userRow]} testID={testID}>{ai && <AiAvatar size="sm" />}<View style={[styles.bubble, ai ? styles.ai : styles.user]}><AppText>{message}</AppText>{time && <AppText variant="small" style={styles.time}>{time}</AppText>}</View></View>;
}
const styles = StyleSheet.create({ row: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 }, userRow: { justifyContent: 'flex-end' }, bubble: { borderRadius: radii.md, gap: 4, maxWidth: '78%', paddingHorizontal: 16, paddingVertical: 12 }, ai: { backgroundColor: colors.surfaceWarm, borderColor: colors.primary, borderWidth: 2 }, user: { backgroundColor: colors.primarySoft }, time: { alignSelf: 'flex-end', color: colors.textSub } });
