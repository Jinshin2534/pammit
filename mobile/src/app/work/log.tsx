import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage, useSessionChatMessages } from '@/api';

import { WorkBackButton, WorkPage, WorkTitleHeader, workTextStyles } from '@/components/work/figma-work-ui';
import { parseId } from '@/components/work/work-flow-params';
import { colors, radii } from '@/theme/tokens';

export default function WorkAiLogScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const messages = useSessionChatMessages(parseId(params.sessionId) ?? Number.NaN);

  return (
    <WorkPage
      header={<WorkTitleHeader title="AI相談ログ" />}
      footer={<View style={styles.footer}><WorkBackButton onPress={() => router.back()} /></View>}
      scrollable
      testID="work-ai-log-screen">
      {messages.isPending ? (
        <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>読み込んでいます</Text>
      ) : messages.isError ? (
        <Pressable accessibilityRole="button" onPress={() => void messages.refetch()} style={({ pressed }) => pressed && styles.pressed}>
          <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>{`${errorMessage(messages.error)}\n（押すと読み込み直します）`}</Text>
        </Pressable>
      ) : messages.data.length === 0 ? (
        <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>この作業での相談はまだありません</Text>
      ) : (
        messages.data.map((item) => <LogBubble key={item.id} from={item.role === 'assistant' ? 'ai' : 'user'} message={item.content} />)
      )}
    </WorkPage>
  );
}

function LogBubble({ from, message }: { from: 'user' | 'ai'; message: string }) {
  const user = from === 'user';
  return (
    <View style={[styles.row, user && styles.userRow]}>
      <View style={[styles.bubble, user ? styles.userBubble : styles.aiBubble]}>
        <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.caption, !user && styles.aiText]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignSelf: 'stretch', alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 20, paddingVertical: 16, width: 250 },
  userBubble: { backgroundColor: colors.primarySoft, borderBottomLeftRadius: radii.md, borderTopLeftRadius: radii.md, borderTopRightRadius: radii.md },
  aiBubble: { backgroundColor: colors.primary, borderBottomRightRadius: radii.md, borderTopLeftRadius: radii.md, borderTopRightRadius: radii.md },
  aiText: { color: colors.textInverse },
  footer: { paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
