import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Toast } from '@/components/feedback';
import { FlowFooter } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, SmallButton } from '@/components/ui';

export default function VolumeScreen() {
  const [volume, setVolume] = useState(70);
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return <PageLayout variant="centered" header={<ScreenHeader title="音量" showBack onBack={() => router.back()} topPadding={16} />} footer={<FlowFooter nextLabel="保存" onBack={() => router.back()} onNext={save} />} testID="volume-screen"><AppText variant="display">{volume}%</AppText><View style={styles.controls}><SmallButton label="－ 小さく" variant="outline" onPress={() => setVolume((value) => Math.max(0, value - 10))} /><SmallButton label="＋ 大きく" onPress={() => setVolume((value) => Math.min(100, value + 10))} /></View><AppText>AIの声を、この音量で再生します。</AppText><Toast visible={saved} message="音量を保存しました" /></PageLayout>;
}
const styles = StyleSheet.create({ controls: { flexDirection: 'row', gap: 12, justifyContent: 'center' } });
