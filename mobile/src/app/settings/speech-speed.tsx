import { router } from 'expo-router';
import { useState } from 'react';
import { Toast } from '@/components/feedback';
import { FlowFooter } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Radio } from '@/components/ui';

export default function SpeechSpeedScreen() {
  const [speed, setSpeed] = useState('ふつう');
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return <PageLayout variant="centered" header={<ScreenHeader title="話す速さ" showBack onBack={() => router.back()} topPadding={16} />} footer={<FlowFooter nextLabel="保存" onBack={() => router.back()} onNext={save} />} testID="speech-speed-screen"><AppText>AIが話す速さを選んでください。</AppText>{['はやい', 'ふつう', 'ゆっくり', 'すごくゆっくり'].map((label) => <Radio key={label} label={label} selected={speed === label} onPress={() => setSpeed(label)} />)}<Toast visible={saved} message="話す速さを保存しました" /></PageLayout>;
}
