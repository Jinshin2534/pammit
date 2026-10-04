import { router } from 'expo-router';
import { useState } from 'react';
import { Dialog } from '@/components/feedback';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, ListItem, SmallButton } from '@/components/ui';

export default function SettingsScreen() {
  const [logoutOpen, setLogoutOpen] = useState(false);
  return <PageLayout header={<ScreenHeader title="設定" showBack onBack={() => router.back()} topPadding={16} />} testID="settings-screen"><AppText variant="bodyLgBold">端末と音声</AppText><ListItem title="帽子の接続" description="未接続" onPress={() => router.push('../settings/hat')} /><ListItem title="音量" description="70%" onPress={() => router.push('../settings/volume')} /><ListItem title="話す速さ" description="ふつう" onPress={() => router.push('../settings/speech-speed')} /><AppText variant="bodyLgBold">アカウント</AppText><ListItem title="プロフィール" description="名前と役割を確認・変更" onPress={() => router.push('../settings/profile')} /><SmallButton label="ログアウト" variant="outline" onPress={() => setLogoutOpen(true)} /><Dialog visible={logoutOpen} title="ログアウトしますか？" body="もう一度利用するときは、PINの入力が必要です。" confirmLabel="ログアウト" onConfirm={() => router.replace('/(auth)/role')} onCancel={() => setLogoutOpen(false)} /></PageLayout>;
}
