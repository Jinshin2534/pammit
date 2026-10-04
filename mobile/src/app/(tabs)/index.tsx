import { router, useLocalSearchParams } from 'expo-router';

import { ConnectionErrorBanners } from '@/components/feedback';
import { HomePage } from '@/components/home/home-page';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';

const routes: Record<BottomNavTab, '/(tabs)' | '/(tabs)/schedule' | '/(tabs)/farm' | '/(tabs)/ai' | '/admin'> = {
  home: '/(tabs)',
  schedule: '/(tabs)/schedule',
  farm: '/(tabs)/farm',
  ai: '/(tabs)/ai',
  admin: '/admin',
};

export default function HomeScreen() {
  const { offline } = useLocalSearchParams<{ offline?: string }>();
  return (
    <HomePage
      userName="確認ユーザー"
      advice={{
        summary: '今日は気温が上がる予報です。午前中の作業がおすすめです。',
        detail: '午後は暑くなるため、こまめに休憩と水分補給をしてください。',
      }}
      schedules={[
        { id: '1', start: '09:00', end: '10:30', work: '摘果・摘葉', place: '三番ハウス', members: ['確認ユーザー'] },
        { id: '2', start: '13:00', end: '14:00', work: '灌水', place: '一番ハウス', members: ['山田さん'] },
      ]}
      statusBanner={
        <ConnectionErrorBanners
          networkDisconnected={offline === '1'}
          onRetryNetwork={() => router.setParams({ offline: undefined })}
          testID="home-connection-errors"
        />
      }
      footer={<BottomNav role="owner" activeTab="home" onTabPress={(tab) => router.navigate(routes[tab])} />}
      onWorkStart={() => router.push('/work')}
      onAi={() => router.push('/(tabs)/ai')}
      onSchedule={() => router.push('/(tabs)/schedule')}
    />
  );
}
