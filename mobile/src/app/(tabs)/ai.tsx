import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { AiAvatar, ChatInput } from '@/components/chat';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, SmallButton } from '@/components/ui';
import { colors, radii } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;
const topics = ['病害について', '収穫について', 'スケジュールについて', 'その他'];

export default function AiChatScreen() {
  const [message, setMessage] = useState('');
  const [showTopics, setShowTopics] = useState(false);

  const send = () => {
    if (!message.trim()) return;
    setShowTopics(true);
    setMessage('');
  };

  return (
    <PageLayout
      background={<HeaderBackground />}
      contentPadding={0}
      header={<View style={styles.header}>
        <ScreenHeader title="ベテランAI相談" />
        <SmallButton label="過去の会話を見る" variant="soft" onPress={() => setShowTopics(false)} style={styles.historyButton} />
      </View>}
      footer={<View style={styles.footer}>
        <ChatInput value={message} onChangeText={setMessage} onFocus={() => setShowTopics(true)} onSend={send} />
        <BottomNav role="worker" activeTab="ai" onTabPress={(tab) => router.navigate(routes[tab])} />
      </View>}
      scrollable={false}
      testID="ai-screen">
      <View style={[styles.content, showTopics && styles.contentTopics]}>
        {showTopics && <View style={styles.bubble}>
          <AppText variant="caption" style={styles.bubbleText}>{'ごきげんよう！\nここではすだち農業についての様々な\n質問が行えるよ！'}</AppText>
        </View>}
        <Pressable accessibilityRole="button" accessibilityLabel="相談の話題を表示" onPress={() => setShowTopics(true)} style={styles.avatarButton}>
          <AiAvatar />
        </Pressable>
        {showTopics && <View style={styles.suggestions}>
          {topics.map((topic) => <SmallButton key={topic} label={topic} onPress={() => setMessage(topic)} style={styles.topic} />)}
        </View>}
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center' },
  historyButton: { alignSelf: 'center', marginTop: -16 },
  content: { flex: 1, justifyContent: 'flex-end', marginBottom: -24, paddingBottom: 12, paddingHorizontal: 16 },
  contentTopics: { gap: 12 },
  avatarButton: { alignSelf: 'flex-start' },
  bubble: { backgroundColor: colors.primary, borderBottomRightRadius: radii.md, borderTopLeftRadius: radii.md, borderTopRightRadius: radii.md, paddingHorizontal: 20, paddingVertical: 16, width: 250 },
  bubbleText: { color: colors.textInverse, lineHeight: 13 },
  suggestions: { gap: 6, paddingHorizontal: 16, width: '100%' },
  topic: { alignSelf: 'stretch', width: '100%' },
  footer: { alignItems: 'center', gap: 12 },
});
