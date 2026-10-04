import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChatBubble, ChatInput } from '@/components/chat';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, ListItem, SmallButton } from '@/components/ui';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;

export default function AiChatScreen() {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const topics = ['葉の切り方', '水やりの量', '収穫のタイミング'];
  return <PageLayout header={<ScreenHeader title="AI相談" topPadding={16} />} footer={<View><ChatInput value={message} onChangeText={setMessage} onSend={() => { setSent((items) => [...items, message]); setMessage(''); }} /><BottomNav role="owner" activeTab="ai" onTabPress={(tab) => router.navigate(routes[tab])} /></View>} testID="ai-screen"><AppText variant="bodyLgBold">話題を選ぶ</AppText><View style={styles.topics}>{topics.map((topic) => <SmallButton key={topic} label={topic} variant="outline" onPress={() => setMessage(topic)} />)}</View><AppText variant="bodyLgBold">会話</AppText><ChatBubble sender="ai" message="農作業で気になることを、何でも聞いてください。" />{sent.map((text, index) => <View key={`${text}-${index}`} style={styles.chat}><ChatBubble sender="user" message={text} /><ChatBubble sender="ai" message="状況を確認しながら、無理のない方法で進めましょう。" /></View>)}<AppText variant="bodyLgBold">過去の会話</AppText><ListItem title="摘果・摘葉の相談" description="2026年10月3日" onPress={() => setMessage('前回の相談を続けたい')} /><ListItem title="灌水の相談" description="2026年10月1日" onPress={() => setMessage('水やりについて相談したい')} /></PageLayout>;
}

const styles = StyleSheet.create({ topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chat: { gap: 8 } });
