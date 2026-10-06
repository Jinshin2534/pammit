import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { errorMessage, isOfflineError, useDailyAdvice, useSchedules } from '@/api';
import type { Schedule } from '@/api/types';
import { HomePage } from '@/components/home/home-page';
import { BottomNav, BottomNavTab } from '@/components/navigation/bottom-nav';
import { ScheduleDetailSheet, toScheduleCards } from '@/components/schedule';
import { jstParts, todayJst } from '@/lib/datetime';
import { useCurrentUser } from '@/providers/auth';

const routes: Record<BottomNavTab, '/(tabs)' | '/(tabs)/schedule' | '/(tabs)/farm' | '/(tabs)/ai' | '/admin'> = {
  home: '/(tabs)',
  schedule: '/(tabs)/schedule',
  farm: '/(tabs)/farm',
  ai: '/(tabs)/ai',
  admin: '/admin',
};

const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
const pad = (value: number) => String(value).padStart(2, '0');

/** 日本時間の「2026 / 10 / 10 (土)   12:15」 */
function formatNow(now: Date) {
  const { year, month, day, hour, minute, weekday } = jstParts(now);
  return `${year} / ${pad(month)} / ${pad(day)} (${weekdays[weekday]})   ${pad(hour)}:${pad(minute)}`;
}

/** 分が変わるたびに今の時刻を更新する */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return now;
}

export default function HomeScreen() {
  const { offline } = useLocalSearchParams<{
    offline?: string;
  }>();
  const me = useCurrentUser();
  const role = me?.role ?? 'worker';
  const userName = me?.name ?? '';
  const now = useNow();
  const today = todayJst(now);
  const advice = useDailyAdvice(today);
  const schedules = useSchedules(today, today);
  const [openScheduleId, setOpenScheduleId] = useState<number | null>(null);
  const cards = toScheduleCards(schedules.data ?? []);
  const openSchedule = schedules.data?.find((schedule) => schedule.id === openScheduleId) ?? null;
  const isOffline = offline === '1' || isOfflineError(advice.error) || isOfflineError(schedules.error);

  const navigateTab = (tab: BottomNavTab) => {
    router.navigate({ pathname: routes[tab], params: { role, userName } });
  };

  const editSchedule = (schedule: Schedule) => {
    setOpenScheduleId(null);
    router.push({ pathname: '/schedule/new', params: { id: String(schedule.id), date: schedule.date } });
  };

  return (
    <>
      <HomePage
        userName={userName}
        advice={{
          summary: advice.data?.summary ?? (advice.isError ? errorMessage(advice.error) : ''),
          detail: advice.data?.body ?? '',
        }}
        now={formatNow(now)}
        schedules={cards}
        offline={isOffline}
        footer={<BottomNav role={role} activeTab="home" onTabPress={navigateTab} />}
        onAdviceDetail={() => router.push({ pathname: '/home/advice', params: { role, userName } })}
        onSettings={() => router.push({ pathname: '/(tabs)/settings', params: { role, userName } })}
        onWorkStart={() => router.push('/work')}
        onAi={() => router.push({ pathname: '/(tabs)/ai', params: { role, userName } })}
        onSchedule={() => router.push({ pathname: '/(tabs)/schedule', params: { role, userName } })}
        onScheduleEdit={(id) => setOpenScheduleId(cards.find((card) => card.id === id)?.scheduleId ?? null)}
      />
      <ScheduleDetailSheet schedule={openSchedule} onClose={() => setOpenScheduleId(null)} onEdit={editSchedule} testID="home-schedule-detail" />
    </>
  );
}
