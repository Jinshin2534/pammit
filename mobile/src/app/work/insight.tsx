import { router } from 'expo-router';
import { useState } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Card, SmallButton, TextField } from '@/components/ui';

export default function InsightScreen() {
  const [insight, setInsight] = useState('');
  const [recording, setRecording] = useState(false);
  return <PageLayout variant="centered" header={<ScreenHeader title="今日の気づき" topPadding={16} />} testID="work-insight-screen"><Card title="作業、おつかれさまでした！" body="気づいたことを声または文字で残せます。記録は任意です。" variant="filled" /><SmallButton label={recording ? '録音を停止' : '声で記録する'} onPress={() => setRecording((value) => !value)} /><TextField label="気づいたこと" value={insight} onChangeText={setInsight} placeholder="例：入口側の実が大きくなっていた" inputProps={{ multiline: true }} /><Button label="記録してホームへ" size="lg" onPress={() => router.replace('/(tabs)')} /><SmallButton label="今回はスキップ" variant="outline" onPress={() => router.replace('/(tabs)')} /><AppText variant="caption">録音や文字起こしに失敗した場合も、もう一度試すかスキップできます。</AppText></PageLayout>;
}
