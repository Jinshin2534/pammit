import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage, isApiError, isOfflineError, useWorkSession } from '@/api';
import { Dialog } from '@/components/feedback';
import { Button } from '@/components/ui';
import { ActiveWorkHeader, WorkButton, WorkChoice, WorkCounts, WorkPage, workTextStyles } from '@/components/work/figma-work-ui';
import { parseId } from '@/components/work/work-flow-params';
import { hatController } from '@/hat';
import { openWorkChat } from '@/components/work/work-navigation';
import { toJstTime } from '@/lib/datetime';
import { fromApiWorkType, isHatWorkType } from '@/lib/work-types';
import { colors, fonts, radii } from '@/theme/tokens';

const pad = (value: number) => String(value).padStart(2, '0');

/** 始めた時刻からの経過を "HH:MM:SS" で */
function formatElapsed(startedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

export default function ActiveWorkScreen() {
  const params = useLocalSearchParams<{ sessionId?: string; resumed?: string; hatDisconnected?: string }>();
  const sessionId = parseId(params.sessionId) ?? Number.NaN;
  const session = useWorkSession(sessionId);
  const [askResume, setAskResume] = useState(params.resumed === '1');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ほかの端末で終えた・見つからない作業は、ホームに戻す
  const ended = Boolean(session.data?.ended_at);
  const notFound = isApiError(session.error, 'session_not_found');
  // 終了確認から先へ進んだときにも ended になるので、この画面が前に出ているときだけ戻す
  useFocusEffect(
    useCallback(() => {
      if (ended || notFound) router.replace('/(tabs)');
    }, [ended, notFound]),
  );

  const data = session.data;
  // 帽子を使う作業のあいだ、帽子の判定と相談をこの作業に記録する。判定を送ったら件数を読み直す
  const hatSessionId = data?.uses_hat && !data.ended_at ? data.id : null;
  const { refetch } = session;
  useEffect(() => {
    if (hatSessionId == null) return;
    hatController.setWorkSession(hatSessionId);
    let sent = -1;
    const unsubscribe = hatController.subscribe((snapshot) => {
      if (sent >= 0 && snapshot.sentDetections !== sent) void refetch();
      sent = snapshot.sentDetections;
    });
    return () => {
      unsubscribe();
      hatController.setWorkSession(null);
    };
  }, [hatSessionId, refetch]);

  // 件数は、帽子を使って判定する作業のときだけ出す
  const showCounts = data ? data.uses_hat && isHatWorkType(fromApiWorkType(data.work_type)) : false;
  const offline = !data && isOfflineError(session.error);
  const disconnected = Boolean(data?.uses_hat) && params.hatDisconnected === '1';
  const goFinish = () => router.push({ pathname: '/work/finish', params: { sessionId: String(sessionId) } });
  const openLog = () => router.push({ pathname: '/work/log', params: { sessionId: String(sessionId) } });

  return (
    <WorkPage
      backgroundPosition="center"
      header={<>{disconnected ? <ConnectionBanner kind="hat" /> : offline ? <ConnectionBanner kind="network" /> : null}<ActiveWorkHeader plot={data?.plot_name ?? ''} work={data?.work_type ?? ''} compact={disconnected || offline} /></>}
      footer={<View style={styles.footer}><WorkButton accessibilityHint="長押しすると終了確認へ進みます" label="作業終了" variant="cta" disabled={!data} onLongPress={goFinish} onPress={() => undefined} /><Text maxFontSizeMultiplier={1.2} style={workTextStyles.caption}>長押し</Text></View>}
      contentStyle={styles.content}
      testID="work-active-screen">
      {!data ? (
        <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>
          {session.isError ? errorMessage(session.error) : '作業を読み込んでいます'}
        </Text>
      ) : showCounts ? (
        <>
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLg}>作業ログ</Text>
          <WorkCounts take={data.counts?.take ?? 0} keep={data.counts?.keep ?? 0} unknown={data.counts?.unknown ?? 0} />
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLgBold}>{formatElapsed(data.started_at, now)}</Text>
          <WorkChoice label="AI相談ログ" onPress={openLog} />
        </>
      ) : (
        <>
          <Text maxFontSizeMultiplier={1.2} style={workTextStyles.bodyLgBold}>{formatElapsed(data.started_at, now)}</Text>
          {data.uses_hat
            ? <WorkChoice label="AI相談ログ" onPress={openLog} />
            : <WorkChoice label="AI相談" onPress={() => openWorkChat(data.id)} />}
        </>
      )}

      <Dialog
        visible={askResume && Boolean(data) && !ended}
        title="終わっていない作業があります"
        body={data ? `${data.plot_name}　${data.work_type}（${toJstTime(data.started_at)}から）` : undefined}
        confirmLabel="続ける"
        cancelLabel="閉じる"
        onConfirm={() => setAskResume(false)}
        onCancel={() => setAskResume(false)}>
        <Button
          label="作業を終える"
          variant="primary"
          onPress={() => {
            setAskResume(false);
            goFinish();
          }}
        />
      </Dialog>
    </WorkPage>
  );
}

function ConnectionBanner({ kind }: { kind: 'hat' | 'network' }) {
  const message = kind === 'hat'
    ? '帽子との接続が切れました。帽子の電源と距離を確認してください'
    : '通信が切れています。通信が必要な機能は利用できません';
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <View style={styles.alertIcon}><Text style={styles.alertMark}>!</Text></View>
      <Text maxFontSizeMultiplier={1.2} style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  center: { textAlign: 'center' },
  footer: { alignItems: 'center', gap: 6, paddingBottom: 32, paddingHorizontal: 40, paddingTop: 12 },
  banner: { alignItems: 'center', backgroundColor: colors.cta, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, width: '100%' },
  alertIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.full, height: 24, justifyContent: 'center', width: 24 },
  alertMark: { color: colors.cta, fontFamily: fonts.bold, fontSize: 15, includeFontPadding: false, lineHeight: 25 },
  bannerText: { color: colors.textInverse, flex: 1, fontFamily: fonts.medium, fontSize: 15, includeFontPadding: false, lineHeight: 18 },
});
