import { router, useLocalSearchParams } from 'expo-router';

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
      userName="近未来 すだち子"
      advice={{
        summary: '高温になる前に収穫。身が密集している木から先に着るのがおすすめです。',
        detail: '日中の気温が上がると、作業する人の負担も大きくなります。午前中など比較的涼しい時間帯に、実が密集している木から確認してみましょう。込み合った部分を先に見ることで、残す実を見比べやすくなり、作業の優先順位も立てやすくなります。\n※最終的な摘果の基準や順番は、農園の状態・栽培方針に合わせて経験者の判断を優先してください。',
      }}
      schedules={[
        { id: '1', start: '08:00', end: '11:30', work: '収穫', place: 'すだち農園', members: ['野﨑'] },
        { id: '2', start: '13:00', end: '14:30', work: '防除', place: 'すだち農園', members: ['長谷川', '野﨑'] },
      ]}
      offline={offline === '1'}
      footer={<BottomNav role="worker" activeTab="home" onTabPress={(tab) => router.navigate(routes[tab])} />}
      onAdviceDetail={() => router.push('/home/advice')}
      onSettings={() => router.push('/(tabs)/settings')}
      onWorkStart={() => router.push('/work')}
      onAi={() => router.push('/(tabs)/ai')}
      onSchedule={() => router.push('/(tabs)/schedule')}
    />
  );
}
