import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { ListItem } from '@/components/ui';
import { colors, strokes } from '@/theme/tokens';
import { useAppState } from '@/providers/app-state';

export default function UserScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = roleParam === 'owner' ? 'owner' : 'worker';
  const { users } = useAppState();
  const visibleUsers = users.filter((user) => user.role === role);

  return (
    <PageLayout
      background={<HeaderBackground position="top" />}
      header={<ScreenHeader title="お名前を選択" showBack onBack={() => router.back()} />}
      scrollable
      testID="user-screen">
      {visibleUsers.map((user) => (
        <ListItem
          key={user.id}
          title={user.name}
          showChevron={false}
          style={styles.item}
          onPress={() =>
            router.push({
              pathname: '/(auth)/pin',
              params: { role, userId: user.id, userName: user.name },
            })
          }
          testID={`user-${user.id}`}
        />
      ))}
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: strokes.default,
    height: 58,
    minHeight: 58,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
});
