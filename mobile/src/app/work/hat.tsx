import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlowFooter, StepHeader } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { AppText, Card, Radio, SmallButton } from '@/components/ui';

export default function HatConnectionScreen() {
  const params = useLocalSearchParams<{ plot?: string; work?: string }>();
  const [hat, setHat] = useState('使用する');
  const [connected, setConnected] = useState(false);
  return <PageLayout header={<StepHeader title="帽子の接続" current={3} total={4} onBack={() => router.back()} />} footer={<FlowFooter onBack={() => router.back()} onNext={() => router.push({ pathname: '/work/confirm', params: { ...params, hat } })} nextDisabled={hat === '使用する' && !connected} />} testID="work-hat-screen"><Radio label="帽子を使用する" selected={hat === '使用する'} onPress={() => setHat('使用する')} /><Radio label="帽子なしで作業する" selected={hat === '使用しない'} onPress={() => setHat('使用しない')} /><Card title={connected ? '帽子に接続しました' : '帽子を探しています'} body={connected ? '判定の準備ができました。' : '帽子の電源とスマホとの距離を確認してください。'} variant={connected ? 'filled' : 'muted'}><SmallButton label={connected ? '再接続' : '接続する'} onPress={() => setConnected(true)} /><AppText variant="caption">摘果・摘葉と収穫では帽子の判定を利用できます。</AppText></Card></PageLayout>;
}
