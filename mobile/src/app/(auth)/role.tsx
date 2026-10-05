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
      <AppText variant="title" style={styles.title}>
        {'どちらが\nログインしますか？'}
      </AppText>
      <ListItem
        title="師匠農家さん"
        titleVariant="bodyMd"
        contentAlign="center"
        showChevron={false}
        style={styles.item}
        onPress={() => selectRole('owner')}
        testID="role-owner-card"
      />
      <ListItem
        title="後継者さん / アルバイト"
        titleVariant="bodyMd"
        fitTitle
        contentAlign="center"
        showChevron={false}
        style={styles.item}
        onPress={() => selectRole('worker')}
        testID="role-worker-card"
      />
    </PageLayout>
  );
}

const styles = {
  title: {
    alignSelf: 'center' as const,
    lineHeight: 51,
    textAlign: 'center' as const,
    transform: [{ translateY: -4 }],
    width: 315,
  },
  item: {
    alignSelf: 'center' as const,
    borderColor: colors.primary,
    borderWidth: strokes.default,
    height: 100,
    paddingHorizontal: 12,
    paddingVertical: 13,
    transform: [{ translateY: -4 }],
    width: 280,
  },
};
