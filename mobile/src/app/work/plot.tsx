import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlowFooter, StepHeader } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { Radio } from '@/components/ui';

export default function WorkPlotScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string }>();
  const [plot, setPlot] = useState(params.plot ?? '');
  return <PageLayout header={<StepHeader title="園地を選ぶ" current={1} total={4} onBack={() => router.back()} />} footer={<FlowFooter onBack={() => router.back()} onNext={() => router.push({ pathname: '/work/type', params: { plot, work: params.work } })} nextDisabled={!plot} />} testID="work-plot-screen">{['一番ハウス', '二番ハウス', '三番ハウス'].map((name) => <Radio key={name} label={name} selected={plot === name} onPress={() => setPlot(name)} />)}</PageLayout>;
}
