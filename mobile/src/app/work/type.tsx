import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WorkChoice, WorkFlowFooter, WorkPage, WorkStepHeader } from '@/components/work/figma-work-ui';
import { flowParams, parseWorkTypeKey, workTypeOptions, type WorkFlowParams } from '@/components/work/work-flow-params';
import { workTypeLabel, type WorkTypeKey } from '@/lib/work-types';
import { spacing } from '@/theme/tokens';

export default function WorkTypeScreen() {
  const params = useLocalSearchParams<WorkFlowParams>();
  // 予定から来たときは予定の作業だけ。1つならそれを選んでおく
  const options = workTypeOptions(params.workTypes);
  const [work, setWork] = useState<WorkTypeKey | null>(() => {
    const current = parseWorkTypeKey(params.work);
    if (current && options.includes(current)) return current;
    return params.workTypes && options.length === 1 ? options[0] : null;
  });

  const goNext = () => {
    if (!work) return;
    router.push({ pathname: '/work/hat', params: flowParams({ ...params, work }) });
  };

  return (
    <WorkPage
      header={<WorkStepHeader current={2} title="作業を選ぶ" />}
      footer={<WorkFlowFooter onBack={() => router.back()} onNext={goNext} nextDisabled={!work} />}
      scrollable
      testID="work-type-screen">
      <View style={styles.options}>
        {options.map((key) => <WorkChoice key={key} label={workTypeLabel(key)} selected={work === key} onPress={() => setWork(key)} />)}
      </View>
    </WorkPage>
  );
}

const styles = StyleSheet.create({ options: { alignSelf: 'stretch', gap: spacing.gap } });
