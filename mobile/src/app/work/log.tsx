import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { WorkBackButton, WorkPage, WorkTitleHeader, workTextStyles } from '@/components/work/figma-work-ui';
import { colors, radii } from '@/theme/tokens';

const messages = [
  { from: 'user', message: 'このすだちはとても形が良くて緑だけど、白く表面が禿げているところが1箇所だけあるの。今回の作業は2Lのみ収穫とのことだったけれど、これはとったほうがいい？' },
  { from: 'ai', message: '今回が「２Lのみ」という基準で収穫しているのであれば、採っても大丈夫です。それくらいの傷であれば青秀の規格にはなるでしょう。' },
  { from: 'user', message: 'ではこれも同じくらいの傷だけど採っても大丈夫そう？' },
  { from: 'ai', message: 'それはとらない方が良い可能性が高いです。それは見えづらいですが、黒いカビがたくさんついています。拭き取ってもまた復活する可能性があります。発送の時に復活すると大変なので、やめておきましょう。' },
] as const;

export default function WorkAiLogScreen() {
  return (
    <WorkPage
      header={<WorkTitleHeader title="AI相談ログ" />}
      footer={<View style={styles.footer}><WorkBackButton onPress={() => router.back()} /></View>}
      scrollable
      testID="work-ai-log-screen">
      {messages.map((item, index) => <LogBubble key={index} {...item} />)}
    </WorkPage>
  );
}

function LogBubble({ from, message }: typeof messages[number]) {
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
});
