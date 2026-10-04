import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { HeaderBackground } from '@/components/background/header-background';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { ListItem } from '@/components/ui';
import { colors, strokes } from '@/theme/tokens';

const users = ['長谷川', '野﨑', '永田', '大久保'] as const;

export default function UserScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = roleParam === 'owner' ? 'owner' : 'worker';

  return (
    <PageLayout
      background={<HeaderBackground position="top" />}
      header={<ScreenHeader title="お名前を選択" showBack onBack={() => router.back()} />}
      scrollable={false}
      testID="user-screen">
      {users.map((userName, index) => (
        <ListItem
          key={userName}
          title={userName}
          showChevron={false}
          style={styles.item}
          onPress={() =>
            router.push({
              pathname: '/(auth)/pin',
              params: { role, userId: `${role}-${index + 1}`, userName },
            })
          }
          testID={`user-${role}-${index + 1}`}
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
