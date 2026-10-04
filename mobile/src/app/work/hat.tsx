import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WorkButton, WorkChoice, WorkFlowFooter, WorkPage, WorkStepHeader, workTextStyles } from '@/components/work/figma-work-ui';
import { announceWorkPrompt } from '@/components/work/work-audio';
import { colors, spacing } from '@/theme/tokens';

export default function HatConnectionScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string; member?: string }>();
  const [testComplete, setTestComplete] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const testVoice = () => {
    void announceWorkPrompt('音声テストです。帽子のスピーカーを確認してください');
    setTestComplete(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setTestComplete(false), 2000);
  };

  return (
    <WorkPage
      header={<WorkStepHeader current={4} title="帽子を接続してください" />}
      footer={<WorkFlowFooter status="接続済み" onBack={() => router.back()} onNext={() => router.push({ pathname: '/work/confirm', params: { ...params, hat: '使用する' } })} />}
      testID="work-hat-screen">
      <View style={styles.devices}>
        {['カメラ', 'マイク', 'スピーカー'].map((name) => <WorkChoice key={name} label={name} selected />)}
      </View>
      <WorkButton label="音声をテスト" onPress={testVoice} />
      {testComplete ? <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2} style={styles.testStatus}>音声テストを実行しました</Text> : null}
    </WorkPage>
  );
}

const styles = StyleSheet.create({
  devices: { alignSelf: 'stretch', gap: spacing.gap },
  testStatus: { ...workTextStyles.caption, color: colors.primary, textAlign: 'center' },
});
