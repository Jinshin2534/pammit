import { router, useLocalSearchParams } from 'expo-router';

import { HomePage } from '@/components/home/home-page';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { useAppState } from '@/providers/app-state';

const routes: Record<BottomNavTab, '/(tabs)' | '/(tabs)/schedule' | '/(tabs)/farm' | '/(tabs)/ai' | '/admin'> = {
  home: '/(tabs)',
  schedule: '/(tabs)/schedule',
  farm: '/(tabs)/farm',
  ai: '/(tabs)/ai',
  admin: '/admin',
};

export default function HomeScreen() {
  const { offline } = useLocalSearchParams<{
    offline?: string;
  }>();
  const { schedulesForDate, session } = useAppState();
  const { role, userName } = session;
  const todaySchedules = schedulesForDate('2026-10-10');

  const navigateTab = (tab: BottomNavTab) => {
    router.navigate({ pathname: routes[tab], params: { role, userName } });
  };

  return (
    <HomePage
      userName={userName}
      advice={{
        summary: '高温になる前に収穫。身が密集している木から先に着るのがおすすめです。',
        detail: '日中の気温が上がると、作業する人の負担も大きくなります。午前中など比較的涼しい時間帯に、実が密集している木から確認してみましょう。込み合った部分を先に見ることで、残す実を見比べやすくなり、作業の優先順位も立てやすくなります。\n※最終的な摘果の基準や順番は、農園の状態・栽培方針に合わせて経験者の判断を優先してください。',
      }}
      schedules={todaySchedules}
      offline={offline === '1'}
      footer={<BottomNav role={role} activeTab="home" onTabPress={navigateTab} />}
      onAdviceDetail={() => router.push({ pathname: '/home/advice', params: { role, userName } })}
      onSettings={() => router.push({ pathname: '/(tabs)/settings', params: { role, userName } })}
      onWorkStart={() => router.push('/work')}
      onAi={() => router.push({ pathname: '/(tabs)/ai', params: { role, userName } })}
      onSchedule={() => router.push({ pathname: '/(tabs)/schedule', params: { role, userName } })}
      onScheduleEdit={(id) => router.push({ pathname: '/schedule/new', params: { id, date: '2026-10-10' } })}
    />
  );
}
