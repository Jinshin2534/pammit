import { router } from 'expo-router';
import { useState } from 'react';
import { Toast } from '@/components/feedback';
import { FlowFooter } from '@/components/flow';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { Dropdown, TextField } from '@/components/ui';

export default function ProfileScreen() {
  const [name, setName] = useState('確認ユーザー');
  const [role, setRole] = useState<string[]>(['worker']);
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return <PageLayout header={<ScreenHeader title="プロフィール" showBack onBack={() => router.back()} topPadding={16} />} footer={<FlowFooter nextLabel="保存" onBack={() => router.back()} onNext={save} nextDisabled={!name.trim()} />} testID="profile-screen"><TextField label="名前" value={name} onChangeText={setName} /><Dropdown label="役割" options={[{ label: '師匠農家さん', value: 'owner' }, { label: '後継者・アルバイト', value: 'worker' }]} value={role} onChange={setRole} /><TextField label="農園コード" value="kamiyama-01" onChangeText={() => undefined} disabled /><Toast visible={saved} message="プロフィールを保存しました" /></PageLayout>;
}
