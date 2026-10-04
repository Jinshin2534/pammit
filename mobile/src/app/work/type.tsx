import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlowFooter, StepHeader } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { Radio } from '@/components/ui';

export default function WorkTypeScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string }>();
  const [work, setWork] = useState(params.work ?? '');
  return <PageLayout header={<StepHeader title="作業を選ぶ" current={2} total={4} onBack={() => router.back()} />} footer={<FlowFooter onBack={() => router.back()} onNext={() => router.push({ pathname: '/work/hat', params: { plot: params.plot, work } })} nextDisabled={!work} />} testID="work-type-screen">{['剪定', '灌水', '肥料', '摘果・摘葉', '収穫', '防除', '草刈り', 'その他'].map((name) => <Radio key={name} label={name} selected={work === name} onPress={() => setWork(name)} />)}</PageLayout>;
}
