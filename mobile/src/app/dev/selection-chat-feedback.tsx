import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AiAvatar, ChatBubble, ChatInput } from '@/components/chat';
import { Banner, Dialog, Toast } from '@/components/feedback';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Dropdown, ListItem, SmallButton } from '@/components/ui';

const workOptions = [
  { label: '摘果・摘葉', value: 'thinning', description: '帽子の判定を使えます' },
  { label: '収穫', value: 'harvest', description: '帽子の判定を使えます' },
  { label: '灌水', value: 'irrigate' },
] as const;

export default function SelectionChatFeedbackPreview() {
  const [works, setWorks] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState('この葉は切った方がいいですか？');
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState(false);

  if (!__DEV__) return <Redirect href="/" />;

  const save = () => { setDialog(false); setToast(true); };
  return (
    <PageLayout header={<View><Banner kind="network" actionLabel="再試行" onAction={() => setToast(true)} testID="preview-network-banner" /><ScreenHeader title="共通部品の確認" /></View>} testID="selection-chat-feedback-preview">
      <Dropdown label="作業を選ぶ（複数選択）" options={workOptions} value={works} onChange={setWorks} multiple testID="preview-dropdown" />
      <ListItem title="三番ハウス" description="トマト・12a" selected onPress={() => setToast(true)} testID="preview-list-item" />

      <AppText variant="bodyLgBold">AI相談</AppText>
      <View style={{ alignItems: 'center' }}><AiAvatar testID="preview-ai-avatar" /></View>
      <ChatBubble sender="user" message={sent} time="10:20" testID="preview-user-bubble" />
      <ChatBubble sender="ai" message="葉の付け根を確認して、傷んでいる葉だけを切りましょう。" time="10:21" testID="preview-ai-bubble" />
      <ChatInput value={message} onChangeText={setMessage} onSend={() => { setSent(message); setMessage(''); }} testID="preview-chat-input" />

      <Banner kind="hat" actionLabel="再接続" onAction={() => setToast(true)} testID="preview-hat-banner" />
      <SmallButton label="Dialogを開く" onPress={() => setDialog(true)} testID="preview-dialog-open" />
      <Toast visible={toast} message="保存しました" testID="preview-toast" />
      <Dialog visible={dialog} title="この内容で保存しますか？" body="選んだ作業内容を保存します。" confirmLabel="保存" onConfirm={save} onCancel={() => setDialog(false)} testID="preview-dialog" />
    </PageLayout>
  );
}
