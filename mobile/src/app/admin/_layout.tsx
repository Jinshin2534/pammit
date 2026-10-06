import { Redirect, Stack } from 'expo-router';

import { useCurrentUser } from '@/providers/auth';

// 管理者画面は owner だけ。API の 403 owner_only は AuthProvider が受けてホームへ戻す。
export default function AdminLayout() {
  const me = useCurrentUser();
  if (!me) return null;
  if (me.role !== 'owner') return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
