import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authKeys, fetchMe, isApiError, isOfflineError } from '@/api';
import { PammitLogo } from '@/components/branding';
import { Banner } from '@/components/feedback';
import { goToLogin, useAuth } from '@/providers/auth';
import { colors } from '@/theme/tokens';

// 起動時の振り分け。保存済みのトークンが使えればホーム、切れていれば前回の人の PIN 画面、どちらもなければ役割の選択。
export default function IndexScreen() {
  const queryClient = useQueryClient();
  const { ready, hasToken, lastUser, rememberUser } = useAuth();
  const [offline, setOffline] = useState(false);
  const startedRef = useRef(false);

  const route = useCallback(async () => {
    setOffline(false);
    if (!hasToken) {
      goToLogin(lastUser);
      return;
    }
    try {
      const me = await queryClient.fetchQuery({ queryKey: authKeys.me(), queryFn: ({ signal }) => fetchMe(signal), staleTime: 0 });
      await rememberUser(me);
      router.replace('/(tabs)');
    } catch (error) {
      // つながらない・サーバーの一時的なエラーは、ここでやり直せるようにする
      if (isOfflineError(error) || (isApiError(error) && error.status >= 500)) {
        setOffline(true);
        return;
      }
      // token_expired などは AuthProvider が PIN 画面へ戻す。それ以外のエラーは最初からやり直す
      if (!isApiError(error) || error.status !== 401) goToLogin(lastUser);
    }
  }, [hasToken, lastUser, queryClient, rememberUser]);

  // 端末から読み終えたときに1回だけ振り分ける
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    void route();
  }, [ready, route]);

  return (
    <SafeAreaView style={styles.screen}>
      {offline && (
        <Banner kind="network" message="サーバーにつながりません。電波のよい場所でもう一度お試しください" actionLabel="再試行" onAction={() => void route()} testID="logo-offline-banner" />
      )}
      <View style={styles.content} testID="logo-screen">
        <PammitLogo testID="pammit-logo" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 24 },
});
