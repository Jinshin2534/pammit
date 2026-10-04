import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WorkChoice, WorkFlowFooter, WorkPage, WorkStepHeader } from '@/components/work/figma-work-ui';
import { spacing } from '@/theme/tokens';

const workTypes = ['剪定', '灌水', '肥料', '摘果・摘葉', '収穫', '防除', '草刈り', 'その他'] as const;

export default function WorkTypeScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string }>();
  const [work, setWork] = useState(params.work ?? '');

  const goNext = () => {
    router.push({ pathname: '/work/worker', params: { plot: params.plot, work } } as never);
  };

  return (
    <WorkPage
      header={<WorkStepHeader current={2} title="作業を選ぶ" />}
      footer={<WorkFlowFooter onBack={() => router.back()} onNext={goNext} nextDisabled={!work} />}
      scrollable
      testID="work-type-screen">
      <View style={styles.options}>
        {workTypes.map((name) => <WorkChoice key={name} label={name} selected={work === name} onPress={() => setWork(name)} />)}
      </View>
    </WorkPage>
  );
}

const styles = StyleSheet.create({ options: { alignSelf: 'stretch', gap: spacing.gap } });
