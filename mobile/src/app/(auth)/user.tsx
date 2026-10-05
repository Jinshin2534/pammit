import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { errorMessage, useLoginCandidates } from '@/api';
import { HeaderBackground } from '@/components/background/header-background';
import { TopBanner, useHeaderPaddingBelowBanner } from '@/components/feedback';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, ListItem } from '@/components/ui';
import { colors, strokes } from '@/theme/tokens';

export default function UserScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = roleParam === 'owner' ? 'owner' : 'worker';
  const { data: users, error, isPending, refetch } = useLoginCandidates(role);
  const paddingBelowBanner = useHeaderPaddingBelowBanner();

  return (
    <PageLayout
      background={<HeaderBackground position="top" />}
      header={
        <View>
          {error && <TopBanner kind="network" message={errorMessage(error)} actionLabel="再試行" onAction={() => void refetch()} testID="user-error-banner" />}
          <ScreenHeader title="お名前を選択" showBack onBack={() => router.back()} topPadding={error ? paddingBelowBanner : 40} />
        </View>
      }
      scrollable
      testID="user-screen">
      {isPending && (
        <AppText variant="bodyLg" style={styles.message}>
          読み込んでいます
        </AppText>
      )}
      {users?.length === 0 && (
        <AppText variant="bodyLg" style={styles.message}>
          登録されている人がいません
        </AppText>
      )}
      {users?.map((user) => (
        <ListItem
          key={user.id}
          title={user.name}
          showChevron={false}
          style={styles.item}
          onPress={() =>
            router.push({
              pathname: '/(auth)/pin',
              params: { role, userId: String(user.id), userName: user.name },
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
  message: {
    lineHeight: 25,
    textAlign: 'center',
  },
});
