import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { AiAvatar, ChatBubble, ChatInput } from '@/components/chat';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, SmallButton } from '@/components/ui';
import { useAppState } from '@/providers/app-state';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;
const topics = ['病害について', '収穫について', 'スケジュールについて', 'その他'];
const histories = [
  { id: '1', title: 'すだちの病害について', date: '2026 / 10 / 08' },
  { id: '2', title: '収穫のタイミング', date: '2026 / 10 / 03' },
  { id: '3', title: '今週の作業予定', date: '2026 / 09 / 28' },
];

export default function AiChatScreen() {
  const { session } = useAppState();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromWork = from === 'work';
  const [message, setMessage] = useState('');
  const [showTopics, setShowTopics] = useState(true);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'chat' | 'history' | 'historyChat'>('chat');

  const sendMessage = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSentMessage(trimmed);
    setShowTopics(false);
    setMessage('');
  };

  const send = () => sendMessage(message);

  return (
    <PageLayout
      background={<HeaderBackground />}
      contentPadding={0}
      header={mode === 'history'
        ? <ScreenHeader title="過去の会話" showBack onBack={() => setMode('chat')} titleStyle={styles.screenTitle} />
        : mode === 'historyChat'
          ? <ScreenHeader title="会話内容" showBack onBack={() => setMode('history')} titleStyle={styles.screenTitle} />
        : <View style={styles.header}>
          {fromWork
            ? <ScreenHeader title="ベテランAI相談" showBack onBack={() => router.back()} titleStyle={styles.screenTitle} />
            : <ScreenHeader title="ベテランAI相談" titleStyle={styles.screenTitle} />}
          <SmallButton label="過去の会話を見る" variant="soft" onPress={() => setMode('history')} style={styles.historyButton} />
        </View>}
      footer={mode !== 'history' ? <View style={styles.footer}>
        <ChatInput value={message} onChangeText={setMessage} onFocus={() => !sentMessage && setShowTopics(true)} onSend={send} />
        <BottomNav role={session.role} activeTab="ai" onTabPress={(tab) => router.navigate(routes[tab])} />
      </View> : <BottomNav role={session.role} activeTab="ai" onTabPress={(tab) => router.navigate(routes[tab])} />}
      scrollable={false}
      testID="ai-screen">
      {mode !== 'history' ? <View style={[styles.content, showTopics && styles.contentTopics]}>
        <ChatBubble sender="ai" message={'ごきげんよう！\nここではすだち農業についての様々な質問が行えるよ！'} />
        <Pressable accessibilityRole="button" accessibilityLabel="相談の話題を表示" onPress={() => setShowTopics(true)} style={styles.avatarButton}>
          <AiAvatar />
        </Pressable>
        {sentMessage && <ChatBubble sender="user" message={sentMessage} />}
        {showTopics && <View style={styles.suggestions}>
          {topics.map((topic) => <SmallButton key={topic} label={topic} onPress={() => sendMessage(topic)} style={styles.topic} />)}
        </View>}
      </View> : <View style={styles.historyList}>
        {histories.map((history) => (
          <Pressable key={history.id} accessibilityRole="button" onPress={() => { setSentMessage(history.title); setShowTopics(false); setMode('historyChat'); }} style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}>
            <AppText variant="bodyBold" numberOfLines={2} style={styles.historyTitle}>{history.title}</AppText>
            <AppText variant="caption" style={styles.historyDate}>{history.date}</AppText>
          </Pressable>
        ))}
      </View>}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center' },
  screenTitle: { fontSize: 32, lineHeight: 39, paddingHorizontal: 16 },
  historyButton: { alignSelf: 'center', marginTop: -16 },
  content: { flex: 1, justifyContent: 'flex-end', marginBottom: -24, marginTop: -8, paddingBottom: 12, paddingHorizontal: 16 },
  contentTopics: { gap: 12 },
  avatarButton: { alignSelf: 'flex-start' },
  suggestions: { gap: 6, paddingHorizontal: 16, width: '100%' },
  topic: { alignSelf: 'stretch', width: '100%' },
  footer: { alignItems: 'center', gap: 12 },
  historyList: { flex: 1, gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  historyCard: { backgroundColor: '#FFFFFF', borderColor: '#BDF087', borderRadius: 20, borderWidth: 3, gap: 6, paddingHorizontal: 20, paddingVertical: 16 },
  historyTitle: { lineHeight: 20 },
  historyDate: { color: '#69695D', lineHeight: 16 },
  pressed: { opacity: 0.7 },
});
