import { router } from 'expo-router';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { AppText, ListItem } from '@/components/ui';
import { colors, strokes } from '@/theme/tokens';

type LoginRole = 'owner' | 'worker';

export default function RoleScreen() {
  const selectRole = (role: LoginRole) => {
    router.push({ pathname: '/(auth)/user', params: { role } });
  };

  return (
    <PageLayout
      background={<HeaderBackground position="center" />}
      variant="centered"
      scrollable={false}
      testID="role-screen">
      <AppText variant="title" style={{ alignSelf: 'center', textAlign: 'center', width: 315 }}>
        {'どちらが\nログインしますか？'}
      </AppText>
      <ListItem
        title="師匠農家さん"
        contentAlign="center"
        showChevron={false}
        style={{ alignSelf: 'center', height: 100, width: 280, borderWidth: strokes.default, borderColor: colors.primary, paddingHorizontal: 20, paddingVertical: 13 }}
        onPress={() => selectRole('owner')}
        testID="role-owner-card"
      />
      <ListItem
        title="後継者さん / アルバイト"
        contentAlign="center"
        showChevron={false}
        style={{ alignSelf: 'center', height: 100, width: 280, borderWidth: strokes.default, borderColor: colors.primary, paddingHorizontal: 20, paddingVertical: 13 }}
        onPress={() => selectRole('worker')}
        testID="role-worker-card"
      />
    </PageLayout>
  );
}
