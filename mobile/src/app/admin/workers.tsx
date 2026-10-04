import { router } from 'expo-router';
import { useState } from 'react';
import { FlowFooter } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { Dropdown, TextField } from '@/components/ui';

export default function WorkersScreen() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<string[]>(['worker']);
  return <PageLayout header={<ScreenHeader title="作業者登録" showBack onBack={() => router.back()} topPadding={16} />} footer={<FlowFooter nextLabel="登録" onBack={() => router.back()} onNext={() => router.push({ pathname: './workers/complete', params: { name } })} nextDisabled={!name.trim()} />} testID="worker-register-screen"><TextField label="名前" value={name} onChangeText={setName} placeholder="例：山田 花子" /><Dropdown label="役割" options={[{ label: '師匠農家さん', value: 'owner' }, { label: '後継者・アルバイト', value: 'worker' }]} value={role} onChange={setRole} /></PageLayout>;
}
