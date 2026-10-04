import { router } from 'expo-router';
import { useState } from 'react';
import { Toast } from '@/components/feedback';
import { FlowFooter } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { TextField } from '@/components/ui';

export default function PlotsScreen() {
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('トマト');
  const [area, setArea] = useState('');
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => { setSaved(false); router.back(); }, 1200); };
  return <PageLayout header={<ScreenHeader title="農園登録" showBack onBack={() => router.back()} topPadding={16} />} footer={<FlowFooter nextLabel="登録" onBack={() => router.back()} onNext={save} nextDisabled={!name.trim()} />} testID="plot-register-screen"><TextField label="農園名" value={name} onChangeText={setName} placeholder="例：三番ハウス" /><TextField label="作物" value={crop} onChangeText={setCrop} /><TextField label="面積" value={area} onChangeText={setArea} placeholder="例：12a" /><Toast visible={saved} message="農園を登録しました" /></PageLayout>;
}
