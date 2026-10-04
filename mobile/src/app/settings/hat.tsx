import { router } from 'expo-router';
import { useState } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { AppText, Button, Card, SmallButton } from '@/components/ui';

export default function SettingsHatScreen() {
  const [connected, setConnected] = useState(false);
  const [searching, setSearching] = useState(false);
  const connect = () => { setSearching(true); setTimeout(() => { setSearching(false); setConnected(true); }, 600); };
  return <PageLayout variant="centered" header={<ScreenHeader title="帽子の接続" showBack onBack={() => router.back()} topPadding={16} />} testID="settings-hat-screen"><Card title={connected ? '帽子に接続しています' : searching ? '帽子を探しています' : '帽子は未接続です'} body={connected ? '判定機能を利用できます。' : '帽子の電源を入れ、スマホの近くに置いてください。'} variant={connected ? 'filled' : 'muted'}>{connected ? <SmallButton label="接続を解除" variant="outline" onPress={() => setConnected(false)} /> : <Button label={searching ? '接続中…' : '帽子へ接続'} size="lg" loading={searching} onPress={connect} />}</Card><AppText variant="caption">接続できない場合は、帽子の電源・距離・スマホのBluetoothを確認してください。</AppText></PageLayout>;
}
