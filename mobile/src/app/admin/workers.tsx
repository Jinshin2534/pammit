import { router } from 'expo-router';
import { useState } from 'react';

import { AdminDropdown, AdminFlowFooter, AdminHeader, AdminPage, AdminTextField } from '@/components/admin/figma-admin-ui';

export default function WorkersScreen() {
  const [name, setName] = useState('田中みのる');
  const [gender, setGender] = useState('女');
  const [workerType, setWorkerType] = useState('アルバイト');
  const [weeklyHours, setWeeklyHours] = useState('-');

  return (
    <AdminPage header={<AdminHeader title="作業者登録" />} footer={<AdminFlowFooter onBack={() => router.back()} onNext={() => router.push({ pathname: '/admin/workers/complete', params: { name } })} />} testID="worker-register-screen">
      <AdminTextField label="名前" value={name} onChangeText={setName} />
      <AdminDropdown label="性別" value={gender} onPress={() => setGender((current) => current === '女' ? '男' : '女')} />
      <AdminDropdown label="作業者種別" value={workerType} onPress={() => setWorkerType((current) => current === 'アルバイト' ? '後継者' : 'アルバイト')} />
      <AdminTextField label="週間最大稼働時間" value={weeklyHours} onChangeText={setWeeklyHours} />
    </AdminPage>
  );
}
