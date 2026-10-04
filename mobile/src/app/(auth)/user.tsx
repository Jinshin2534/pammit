import { router, useLocalSearchParams } from 'expo-router';

import { PammitLogo } from '@/components/branding';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { ListItem } from '@/components/ui';

const users = {
  owner: [
    { id: 'owner-1', name: '山田 太郎', note: '師匠農家さん' },
    { id: 'owner-2', name: '佐藤 花子', note: '師匠農家さん' },
  ],
  worker: [
    { id: 'worker-1', name: '鈴木 一郎', note: '後継者' },
    { id: 'worker-2', name: '田中 美咲', note: 'アルバイト' },
    { id: 'worker-3', name: '高橋 実', note: 'アルバイト' },
  ],
} as const;

export default function UserScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = roleParam === 'owner' ? 'owner' : 'worker';

  return (
    <PageLayout header={<ScreenHeader title="名前を選ぶ" showBack onBack={() => router.back()} topPadding={16} />} testID="user-screen">
      <PammitLogo compact />
      {users[role].map((user) => (
        <ListItem
          key={user.id}
          title={user.name}
          description={user.note}
          onPress={() => router.push({ pathname: '/(auth)/pin', params: { role, userId: user.id, userName: user.name } })}
          testID={`user-${user.id}`}
        />
      ))}
    </PageLayout>
  );
}
