import { router, useLocalSearchParams } from 'expo-router';

import { WorkDisplayField, WorkFlowFooter, WorkPage, WorkStepHeader } from '@/components/work/figma-work-ui';

export default function WorkConfirmScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string; hat?: string; member?: string }>();

  return (
    <WorkPage
      header={<WorkStepHeader current={5} title="作業開始の確認" />}
      footer={<WorkFlowFooter nextLabel="作業開始" nextVariant="cta" onBack={() => router.back()} onNext={() => router.replace({ pathname: '/work/active', params })} />}
      testID="work-confirm-screen">
      <WorkDisplayField label="農園" value={params.plot ?? '三番ハウス'} />
      <WorkDisplayField label="作業" value={params.work ?? '摘果・摘葉'} />
      <WorkDisplayField label="担当" value={params.member ?? '未選択'} />
    </WorkPage>
  );
}
