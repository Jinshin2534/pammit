import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorMessage, useWorkPlots } from '@/api';
import { WorkChoice, WorkFlowFooter, WorkPage, WorkStepHeader, workTextStyles } from '@/components/work/figma-work-ui';
import { flowParams, parseId, type WorkFlowParams } from '@/components/work/work-flow-params';
import { spacing } from '@/theme/tokens';

export default function WorkPlotScreen() {
  const params = useLocalSearchParams<WorkFlowParams>();
  // 予定から来たときは予定の農地だけを出す（変えられない）
  const fromSchedule = parseId(params.scheduleId) !== null;
  const plots = useWorkPlots();
  const [plotId, setPlotId] = useState<number | null>(parseId(params.plotId));
  const options = fromSchedule
    ? plotId !== null ? [{ id: plotId, name: params.plotName ?? '' }] : []
    : plots.data ?? [];
  const selected = options.find((plot) => plot.id === plotId);

  const goNext = () => {
    if (!selected) return;
    router.push({ pathname: '/work/type', params: flowParams({ ...params, plotId: String(selected.id), plotName: selected.name }) });
  };

  return (
    <WorkPage
      header={<WorkStepHeader current={1} title="農園を選ぶ" />}
      footer={<WorkFlowFooter onBack={() => router.back()} onNext={goNext} nextDisabled={!selected} />}
      scrollable
      testID="work-plot-screen">
      <View style={styles.options}>
        {!fromSchedule && plots.isPending ? (
          <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>農園を読み込んでいます</Text>
        ) : !fromSchedule && plots.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void plots.refetch()} style={({ pressed }) => pressed && styles.pressed}>
            <Text maxFontSizeMultiplier={1.2} style={[workTextStyles.body, styles.center]}>{`${errorMessage(plots.error)}\n（押すと読み込み直します）`}</Text>
          </Pressable>
        ) : (
          options.map(({ id, name }) => <WorkChoice key={id} label={name} selected={plotId === id} onPress={fromSchedule ? undefined : () => setPlotId(id)} />)
        )}
      </View>
    </WorkPage>
  );
}

const styles = StyleSheet.create({
  options: { alignSelf: 'stretch', gap: spacing.gap },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
