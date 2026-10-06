import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { Dialog } from '@/components/feedback';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { ListItem } from '@/components/ui';
import { useAuth, useCurrentUser } from '@/providers/auth';

const routes: Record<BottomNavTab, '/(tabs)' | '/(tabs)/schedule' | '/(tabs)/farm' | '/(tabs)/ai' | '/admin'> = {
  home: '/(tabs)',
  schedule: '/(tabs)/schedule',
  farm: '/(tabs)/farm',
  ai: '/(tabs)/ai',
  admin: '/admin',
};

export default function SettingsScreen() {
  const role = useCurrentUser()?.role ?? 'worker';
  const { signOut } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const logout = async () => {
    setLogoutOpen(false);
    await signOut();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(auth)/role');
  };

  return (
    <PageLayout
      background={<HeaderBackground position="top" />}
      header={<ScreenHeader title="設定" />}
      footer={
        <BottomNav
          role={role}
          onTabPress={(tab) => router.navigate(routes[tab])}
          testID="settings-bottom-nav"
        />
      }
      scrollable={false}
      testID="settings-screen">
      <View style={{ gap: 20 }}>
        <ListItem title="帽子の接続" onPress={() => router.push('../settings/hat')} />
        <ListItem title="音量" onPress={() => router.push('../settings/volume')} />
        <ListItem title="話す速さ" onPress={() => router.push('../settings/speech-speed')} />
        <ListItem title="プロフィール設定" onPress={() => router.push('../settings/profile')} />
        <ListItem title="ログアウト" onPress={() => setLogoutOpen(true)} />
      </View>

      <Dialog
        visible={logoutOpen}
        title="ログアウトしますか？"
        confirmLabel="はい"
        cancelLabel="戻る"
        onConfirm={() => void logout()}
        onCancel={() => setLogoutOpen(false)}
      />
    </PageLayout>
  );
}
