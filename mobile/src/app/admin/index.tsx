import { router } from 'expo-router';

import { AdminHeader, AdminMenuTile, AdminPage } from '@/components/admin/figma-admin-ui';

export default function AdminScreen() {
  return (
    <AdminPage bottomNav header={<AdminHeader title="管理者画面" />} contentStyle={{ paddingBottom: 24, paddingTop: 24 }} testID="admin-screen">
      <AdminMenuTile label="作業者登録" image={require('../../../assets/images/admin/worker.png')} onPress={() => router.push('/admin/workers')} />
      <AdminMenuTile label="農園登録" image={require('../../../assets/images/admin/farm.png')} onPress={() => router.push('/admin/plots')} />
      <AdminMenuTile label="農園日誌" image={require('../../../assets/images/admin/journal.png')} onPress={() => router.push('/admin/journals')} />
    </AdminPage>
  );
}
