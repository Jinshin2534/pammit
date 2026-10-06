import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage, finishWorkSession, isApiError, isRejectedByServer, useWorkSession, workOutboxKeys, workSessionKeys } from '@/api';
import { WorkBackButton, WorkButton, WorkPage, workTextStyles } from '@/components/work/figma-work-ui';
import { parseId } from '@/components/work/work-flow-params';
import { nowIso } from '@/lib/datetime';
import { fromApiWorkType, isHatWorkType } from '@/lib/work-types';
import { useCurrentUser } from '@/providers/auth';
import { addPendingFinish } from '@/storage';
import { colors } from '@/theme/tokens';

export default function WorkFinishScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = parseId(params.sessionId) ?? Number.NaN;
  const session = useWorkSession(sessionId);
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const data = session.data;
  const showCounts = data ? data.uses_hat && isHatWorkType(fromApiWorkType(data.work_type)) : false;

  // 作業中の画面を戻る先に残さず、「今日の気づき」へ移る
  const goInsight = (syncPending: boolean) => {
    if (router.canDismiss()) router.dismissAll();
    router.replace({ pathname: '/work/insight', params: { sessionId: String(sessionId), ...(syncPending ? { syncPending: '1' } : {}) } });
  };

  const finish = async () => {
    if (!me || !Number.isFinite(sessionId) || sending) return;
    // 実際に終えた時刻。通信が切れていても、この時刻を残してあとで送る
    const endedAt = nowIso();
    setSending(true);
    setMessage(null);
    try {
      const finished = await finishWorkSession(sessionId, endedAt);
      queryClient.setQueryData(workSessionKeys.detail(sessionId), finished);
      void queryClient.invalidateQueries({ queryKey: workSessionKeys.myActive() });
      goInsight(false);
    } catch (error) {
      if (isRejectedByServer(error)) {
        setMessage(errorMessage(error));
        setSending(false);
        return;
      }
      const saved = await addPendingFinish({ userId: me.id, sessionId, endedAt });
      if (!saved) {
        setMessage('終了を端末に残せませんでした。もう一度お試しください');
        setSending(false);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: workOutboxKeys.all });
      // ログインが切れたときは AuthProvider が PIN 画面へ戻すので、ここでは移らない（ログインし直したら送る）
      if (isApiError(error) && error.status === 401) return;
      goInsight(true);
    }
  };

  return (
    <WorkPage
      backgroundPosition="center"
      footer={<View style={styles.footer}><WorkBackButton onPress={() => router.back()} /></View>}
      contentStyle={styles.content}
      testID="work-finish-screen">
      <Text maxFontSizeMultiplier={1.2} style={workTextStyles.title}>終了確認</Text>
      <View style={styles.confirmation}>
        <View style={styles.copy}>
          <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.bodyLg, styles.center]}>{'本当に作業を\n終わりますか？'}</Text>
          {showCounts ? <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>{`切る${data?.counts?.take ?? 0} / 残す${data?.counts?.keep ?? 0} / 判断不可${data?.counts?.unknown ?? 0}`}</Text> : null}
        </View>
        <WorkButton label="作業終了" variant="cta" disabled={sending || !me} onPress={() => void finish()} />
        {message ? <Text accessibilityRole="alert" maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center, styles.error]}>{message}</Text> : null}
      </View>
    </WorkPage>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  confirmation: { alignItems: 'center', alignSelf: 'stretch', gap: 37 },
  copy: { alignSelf: 'stretch', gap: 8 },
  center: { textAlign: 'center' },
  error: { color: colors.cta },
  footer: { paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12 },
});
