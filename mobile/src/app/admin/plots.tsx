import { router } from 'expo-router';
import { useState } from 'react';

import { AdminFlowFooter, AdminHeader, AdminPage, AdminTextField } from '@/components/admin/figma-admin-ui';

export default function PlotsScreen() {
  const [name, setName] = useState('豊作農園');
  const [location, setLocation] = useState('神山町');

  return (
    <AdminPage header={<AdminHeader title="農園登録" />} footer={<AdminFlowFooter onBack={() => router.back()} onNext={() => router.replace('/admin')} />} testID="plot-register-screen">
      <AdminTextField label="農園の名前" value={name} onChangeText={setName} />
      <AdminTextField label="所在地（市区町村）" value={location} onChangeText={setLocation} />
    </AdminPage>
  );
}
