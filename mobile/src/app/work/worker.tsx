import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { WorkChoice, WorkFlowFooter, WorkPage, WorkStepHeader } from '@/components/work/figma-work-ui';
import { useAppState } from '@/providers/app-state';
import { useCurrentUser } from '@/providers/auth';
import { spacing } from '@/theme/tokens';

export default function WorkWorkerScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string; member?: string }>();
  const { users } = useAppState();
  const me = useCurrentUser();
  const [member, setMember] = useState(params.member ?? (me?.role === 'worker' ? me.name : ''));
  const workers = users.filter((user) => user.role === 'worker');

  return (
    <WorkPage
      header={<WorkStepHeader current={3} title="作業者を選ぶ" />}
      footer={<WorkFlowFooter onBack={() => router.back()} onNext={() => router.push({ pathname: '/work/hat', params: { plot: params.plot, work: params.work, member } })} nextDisabled={!member} />}
      scrollable
      testID="work-worker-screen">
      <View style={styles.options}>
        {workers.map((worker) => <WorkChoice key={worker.id} label={worker.name} selected={member === worker.name} onPress={() => setMember(worker.name)} />)}
      </View>
    </WorkPage>
  );
}

const styles = StyleSheet.create({ options: { alignSelf: 'stretch', gap: spacing.gap } });
