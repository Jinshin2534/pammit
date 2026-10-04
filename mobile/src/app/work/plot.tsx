import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WorkChoice, WorkFlowFooter, WorkPage, WorkStepHeader } from '@/components/work/figma-work-ui';
import { spacing } from '@/theme/tokens';

const plots = ['すだち農園', 'ましろん農園', '三番ハウス'] as const;

export default function WorkPlotScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string }>();
  const [plot, setPlot] = useState(params.plot ?? '');

  return (
    <WorkPage
      header={<WorkStepHeader current={1} title="農園を選ぶ" />}
      footer={<WorkFlowFooter onBack={() => router.back()} onNext={() => router.push({ pathname: '/work/type', params: { plot, work: params.work } })} nextDisabled={!plot} />}
      testID="work-plot-screen">
      <View style={styles.options}>
        {plots.map((name) => <WorkChoice key={name} label={name} selected={plot === name} onPress={() => setPlot(name)} />)}
      </View>
    </WorkPage>
  );
}

const styles = StyleSheet.create({ options: { alignSelf: 'stretch', gap: spacing.gap } });
