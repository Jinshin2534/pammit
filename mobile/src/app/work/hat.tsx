import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { WorkButton, WorkChoice, WorkFlowFooter, WorkPage, WorkStepHeader } from '@/components/work/figma-work-ui';
import { spacing } from '@/theme/tokens';

export default function HatConnectionScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string }>();

  return (
    <WorkPage
      header={<WorkStepHeader current={3} title="帽子を接続してください" />}
      footer={<WorkFlowFooter status="接続済み" onBack={() => router.back()} onNext={() => router.push({ pathname: '/work/confirm', params: { ...params, hat: '使用する' } })} />}
      testID="work-hat-screen">
      <View style={styles.devices}>
        {['カメラ', 'マイク', 'スピーカー'].map((name) => <WorkChoice key={name} label={name} selected />)}
      </View>
      <WorkButton label="音声をテスト" onPress={() => undefined} />
    </WorkPage>
  );
}

const styles = StyleSheet.create({ devices: { alignSelf: 'stretch', gap: spacing.gap } });
