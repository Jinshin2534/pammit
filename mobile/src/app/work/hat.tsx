import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WorkButton, WorkChoice, WorkFlowFooter, WorkPage, WorkStepHeader, workTextStyles } from '@/components/work/figma-work-ui';
import { flowParams, type WorkFlowParams } from '@/components/work/work-flow-params';
import { hatController, type HatConnection } from '@/hat';
import { loadSettings } from '@/storage/settings';
import { colors, spacing } from '@/theme/tokens';

export default function HatConnectionScreen() {
  const params = useLocalSearchParams<WorkFlowParams>();
  const [withHat, setWithHat] = useState(params.usesHat !== '0');
  const [connection, setConnection] = useState<HatConnection>('disconnected');
  const [message, setMessage] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connected = connection === 'connected';

  useEffect(() => {
    const unsubscribe = hatController.subscribe((snapshot) => setConnection(snapshot.connection));
    return () => {
      unsubscribe();
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const showMessage = (text: string) => {
    setMessage(text);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  const connect = async () => {
    const { hatIp } = await loadSettings();
    if (!hatIp) {
      showMessage('帽子の IP が設定されていません');
      return;
    }
    try {
      await hatController.start(hatIp);
    } catch {
      showMessage('準備に失敗しました。もう一度押してください');
    }
  };

  const testVoice = async () => {
    try {
      await hatController.say('音声テストです。帽子のスピーカーを確認してください');
      showMessage('帽子に音声を送りました');
    } catch {
      showMessage('音声を送れませんでした');
    }
  };

  const status = !withHat ? '帽子なしで作業します' : connected ? '接続済み' : connection === 'connecting' ? '接続中' : '未接続';
  return (
    <WorkPage
      header={<WorkStepHeader current={3} title="帽子を接続してください" />}
      footer={<WorkFlowFooter
        status={status}
        onBack={() => router.back()}
        onNext={() => router.push({ pathname: '/work/confirm', params: flowParams({ ...params, usesHat: withHat ? '1' : '0' }) })}
        nextDisabled={withHat && !connected}
      />}
      testID="work-hat-screen">
      <View style={styles.devices}>
        {['カメラ', 'マイク', 'スピーカー'].map((name) => <WorkChoice key={name} label={name} selected={withHat && connected} />)}
      </View>
      {withHat
        ? <WorkButton
            label={connected ? '音声をテスト' : connection === 'connecting' ? '接続中…' : '接続する'}
            onPress={connected ? testVoice : connect}
          />
        : null}
      <WorkChoice label="帽子なしで作業する" selected={!withHat} onPress={() => setWithHat((value) => !value)} />
      {message ? <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2} style={styles.testStatus}>{message}</Text> : null}
    </WorkPage>
  );
}

const styles = StyleSheet.create({
  devices: { alignSelf: 'stretch', gap: spacing.gap },
  testStatus: { ...workTextStyles.caption, color: colors.primary, textAlign: 'center' },
});
