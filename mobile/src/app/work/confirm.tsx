import { router, useLocalSearchParams } from 'expo-router';
import { FlowFooter, StepHeader } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { WorkSummary } from '@/components/work';

export default function WorkConfirmScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string; hat?: string }>();
  return <PageLayout header={<StepHeader title="作業開始の確認" current={4} total={4} onBack={() => router.back()} />} footer={<FlowFooter nextLabel="作業を開始" onBack={() => router.back()} onNext={() => router.replace({ pathname: '/work/active', params })} />} testID="work-confirm-screen"><WorkSummary {...params} /></PageLayout>;
}
