import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  ChatThread,
  chatKeys,
  chatMessageMaxLength,
  errorMessage,
  isApiError,
  isOfflineError,
  offlineMessage,
  useChatMessages,
  useChatThreads,
  useSendChatMessage,
} from '@/api';
import { HeaderBackground } from '@/components/background/header-background';
import { AiAvatar, ChatBubble, ChatInput } from '@/components/chat';
import { Banner } from '@/components/feedback';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, SmallButton } from '@/components/ui';
import { jstParts } from '@/lib/datetime';
import { useCurrentUser } from '@/providers/auth';
import { colors } from '@/theme/tokens';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;
const topics = ['病害について', '収穫について', 'スケジュールについて', 'その他'];

/** 過去の会話の日付（最後に話した日、日本時間） */
function threadDate(thread: ChatThread) {
  const { year, month, day } = jstParts(thread.updated_at);
  return `${year} / ${String(month).padStart(2, '0')} / ${String(day).padStart(2, '0')}`;
}

function sendErrorMessage(error: unknown) {
  if (isApiError(error, 'ai_unavailable')) return 'AI相談は今使えません';
  if (isApiError(error, 'timeout')) return '時間がかかっています。もう一度送ってください';
  if (isApiError(error, 'thread_not_found')) return '会話が見つかりませんでした。もう一度送ってください';
  return errorMessage(error);
}

export default function AiChatScreen() {
  const role = useCurrentUser()?.role ?? 'worker';
  // 作業中の画面から開いたときは from=work と作業ID（sessionId）が来る
  const params = useLocalSearchParams<{ from?: string; sessionId?: string }>();
  const fromWork = params.from === 'work';
  const parsedSessionId = Number(params.sessionId);
  const sessionId = fromWork && Number.isInteger(parsedSessionId) && parsedSessionId > 0 ? parsedSessionId : null;
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [showTopics, setShowTopics] = useState(true);
  const [mode, setMode] = useState<'chat' | 'history' | 'historyChat'>('chat');
  // 新しい相談の会話と、過去の会話から開いた会話。最初の送信で会話を作る
  const [newThreadId, setNewThreadId] = useState<number | null>(null);
  const [historyThreadId, setHistoryThreadId] = useState<number | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  // 送れなかった時刻。そのあとに一覧を取り直せたら、通信は戻っている
  const [sendOfflineAt, setSendOfflineAt] = useState<number | null>(null);
  const [threadSessionId, setThreadSessionId] = useState(sessionId);
  const [keyboardShown, setKeyboardShown] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const threads = useChatThreads();
  const activeThreadId = mode === 'historyChat' ? historyThreadId : newThreadId;
  const messages = useChatMessages(activeThreadId);
  const sendChat = useSendChatMessage();
  const sending = sendChat.isPending;
  const offline = (sendOfflineAt !== null && threads.dataUpdatedAt < sendOfflineAt) || (threads.isError && isOfflineError(threads.error));

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // 作業が変わったら、新しい相談をその作業の会話として始め直す
  if (threadSessionId !== sessionId) {
    setThreadSessionId(sessionId);
    setNewThreadId(null);
    setSendError(null);
    setShowTopics(true);
  }

  const { refetch: refetchThreads } = threads;
  useFocusEffect(useCallback(() => { void refetchThreads(); }, [refetchThreads]));

  const sendMessage = (value: string) => {
    const content = value.trim();
    if (!content || sending || offline) return;
    const forHistory = mode === 'historyChat';
    setPending(content);
    setSendError(null);
    setShowTopics(false);
    sendChat.mutate(
      {
        threadId: activeThreadId,
        sessionId: forHistory ? null : sessionId,
        content,
        onThreadCreated: (thread) => (forHistory ? setHistoryThreadId(thread.id) : setNewThreadId(thread.id)),
      },
      {
        onSuccess: () => {
          setPending(null);
          // 待っているあいだに書き足していなければ空にする
          setMessage((current) => (current.trim() === content ? '' : current));
        },
        onError: (error, { threadId }) => {
          // 入力した文は消さず、もう一度送れるようにする
          setPending(null);
          if (isApiError(error, 'network_error')) {
            setSendOfflineAt(Date.now());
            return;
          }
          setSendError(sendErrorMessage(error));
          if (isApiError(error, 'thread_not_found')) {
            if (forHistory) setHistoryThreadId(null);
            else setNewThreadId(null);
            void queryClient.invalidateQueries({ queryKey: chatKeys.threads() });
          } else if (isApiError(error, 'timeout') && threadId !== null) {
            // 時間切れでもサーバーでは答えが残っていることがあるので取り直す
            void queryClient.invalidateQueries({ queryKey: chatKeys.messages(threadId) });
          }
        },
      },
    );
  };

  const send = () => sendMessage(message);

  const openThread = (thread: ChatThread) => {
    setHistoryThreadId(thread.id);
    setSendError(null);
    setShowTopics(false);
    setMode('historyChat');
  };

  const openHistory = () => {
    setMode('history');
    void refetchThreads();
  };

  const closeHistoryChat = () => {
    setSendError(null);
    setMode('history');
  };

  const shownMessages = activeThreadId !== null ? messages.data ?? [] : [];
  const messagesError = activeThreadId !== null && messages.isError && !messages.data ? errorMessage(messages.error) : null;
  const nearLimit = message.length >= chatMessageMaxLength - 200;

  return (
    <PageLayout
      background={<HeaderBackground />}
      contentPadding={0}
      header={mode === 'history'
        ? <ScreenHeader title="過去の会話" showBack onBack={() => setMode('chat')} titleStyle={styles.screenTitle} />
        : mode === 'historyChat'
          ? <ScreenHeader title="会話内容" showBack onBack={closeHistoryChat} titleStyle={styles.screenTitle} />
        : <View style={styles.header}>
          {fromWork
            ? <ScreenHeader title="ベテランAI相談" showBack onBack={() => router.back()} titleStyle={styles.screenTitle} />
            : <ScreenHeader title="ベテランAI相談" titleStyle={styles.screenTitle} />}
          <SmallButton label="過去の会話を見る" variant="soft" onPress={openHistory} style={styles.historyButton} />
        </View>}
      footer={mode !== 'history' ? <View style={styles.footer}>
        {offline && <Banner kind="network" message={offlineMessage} actionLabel="再試行" onAction={() => void refetchThreads()} testID="ai-offline" />}
        {!offline && sendError && <AppText variant="caption" style={styles.sendError} testID="ai-send-error">{sendError}</AppText>}
        {nearLimit && <AppText variant="small" style={styles.counter}>{`${message.length} / ${chatMessageMaxLength}字`}</AppText>}
        <View style={styles.inputRow}>
          <ChatInput
            value={message}
            onChangeText={setMessage}
            onFocus={() => !shownMessages.length && mode === 'chat' && setShowTopics(true)}
            onSend={send}
            sending={sending}
            disabled={offline}
            maxLength={chatMessageMaxLength}
            testID="ai-input"
          />
        </View>
        {!keyboardShown && <BottomNav role={role} activeTab="ai" onTabPress={(tab) => router.navigate(routes[tab])} />}
      </View> : <BottomNav role={role} activeTab="ai" onTabPress={(tab) => router.navigate(routes[tab])} />}
      scrollable={false}
      testID="ai-screen">
      {mode !== 'history' ? <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={[styles.content]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        testID="ai-chat-scroll">
        <ChatBubble sender="ai" message={'ごきげんよう！\nここではすだち農業についての様々な質問が行えるよ！'} />
        <Pressable accessibilityRole="button" accessibilityLabel="相談の話題を表示" onPress={() => setShowTopics(true)} style={styles.avatarButton}>
          <AiAvatar />
        </Pressable>
        {activeThreadId !== null && messages.isPending && !sending && <AppText variant="caption" style={styles.status}>読み込んでいます</AppText>}
        {messagesError && <AppText variant="caption" style={styles.sendError}>{messagesError}</AppText>}
        {shownMessages.map((item) => <ChatBubble key={item.id} sender={item.role === 'assistant' ? 'ai' : 'user'} message={item.content} />)}
        {pending !== null && <>
          <ChatBubble sender="user" message={pending} />
          <ChatBubble sender="ai" message="考えています…" testID="ai-thinking" />
        </>}
        {showTopics && mode === 'chat' && !sending && <View style={styles.suggestions}>
          {topics.map((topic) => <SmallButton key={topic} label={topic} onPress={() => setMessage(topic)} style={styles.topic} />)}
        </View>}
      </ScrollView> : <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyList} testID="ai-history">
        {threads.data
          ? threads.data.length
            ? threads.data.map((thread) => (
              <Pressable key={thread.id} accessibilityRole="button" onPress={() => openThread(thread)} style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}>
                <AppText variant="bodyBold" numberOfLines={2} style={styles.historyTitle}>{thread.title}</AppText>
                <View style={styles.historyMeta}>
                  <AppText variant="caption" style={styles.historyDate}>{threadDate(thread)}</AppText>
                  {thread.session_id !== null && <View style={styles.workMark}><AppText variant="small" style={styles.workMarkText}>作業中の相談</AppText></View>}
                </View>
              </Pressable>
            ))
            : <AppText variant="body" style={styles.status}>過去の会話はまだありません</AppText>
          : threads.isError
            ? <View style={styles.historyState}>
              <AppText variant="body" style={styles.status}>{errorMessage(threads.error)}</AppText>
              <SmallButton label="もう一度読み込む" variant="soft" onPress={() => void refetchThreads()} />
            </View>
            : <AppText variant="body" style={styles.status}>読み込んでいます</AppText>}
      </ScrollView>}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center' },
  screenTitle: { fontSize: 32, lineHeight: 39, paddingHorizontal: 16 },
  historyButton: { alignSelf: 'center', marginTop: -16 },
  chat: { flex: 1, marginBottom: -24, marginTop: -8 },
  content: { flexGrow: 1, gap: 12, justifyContent: 'flex-end', paddingBottom: 12, paddingHorizontal: 16 },
  avatarButton: { alignSelf: 'flex-start' },
  suggestions: { gap: 6, paddingHorizontal: 16, width: '100%' },
  topic: { alignSelf: 'stretch', width: '100%' },
  footer: { alignItems: 'center', gap: 12 },
  inputRow: { paddingHorizontal: 16, width: '100%' },
  sendError: { alignSelf: 'stretch', color: colors.cta, lineHeight: 16, paddingHorizontal: 16 },
  counter: { alignSelf: 'flex-end', color: colors.textSub, lineHeight: 10, marginBottom: -8, paddingHorizontal: 16 },
  status: { color: colors.textSub, lineHeight: 20, textAlign: 'center' },
  historyScroll: { flex: 1 },
  historyList: { gap: 12, paddingBottom: 24, paddingHorizontal: 16, paddingTop: 8 },
  historyState: { alignItems: 'center', gap: 12 },
  historyCard: { backgroundColor: '#FFFFFF', borderColor: '#BDF087', borderRadius: 20, borderWidth: 3, gap: 6, paddingHorizontal: 20, paddingVertical: 16 },
  historyTitle: { lineHeight: 20 },
  historyMeta: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  historyDate: { color: '#69695D', lineHeight: 16 },
  workMark: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  workMarkText: { color: colors.textDeep, lineHeight: 12 },
  pressed: { opacity: 0.7 },
});
