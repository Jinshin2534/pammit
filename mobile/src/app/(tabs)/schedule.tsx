import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PageLayout } from '@/components/layout/page-layout';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { CalendarDay, ScheduleCarousel, WorkTypeLegend } from '@/components/schedule';
import { AppText, Button, Card } from '@/components/ui';

const routes = { home: '/(tabs)', schedule: '/(tabs)/schedule', farm: '/(tabs)/farm', ai: '/(tabs)/ai', admin: '/admin' } as const;

export default function ScheduleScreen() {
  const [day, setDay] = useState(4);
  const hasSchedule = day === 4 || day === 6;
  return <PageLayout contentPadding={16} header={<ScreenHeader title="予定" topPadding={16} />} footer={<BottomNav role="owner" activeTab="schedule" onTabPress={(tab) => router.navigate(routes[tab])} />} testID="schedule-screen"><View style={styles.month}><AppText variant="bodyLgBold">2026年10月</AppText></View><View style={styles.week}>{['日', '月', '火', '水', '木', '金', '土'].map((label) => <AppText key={label} variant="caption" style={styles.weekLabel}>{label}</AppText>)}</View><View style={styles.calendar}>{Array.from({ length: 31 }, (_, index) => { const value = index + 1; return <CalendarDay key={value} day={value} selected={day === value} workTypes={value === 4 ? ['thinning', 'harvest'] : value === 6 ? ['irrigate'] : []} isSunday={value % 7 === 4} isSaturday={value % 7 === 3} onPress={() => setDay(value)} />; })}</View><WorkTypeLegend items={[{ type: 'thinning', label: '摘果・摘葉' }, { type: 'harvest', label: '収穫' }, { type: 'irrigate', label: '灌水' }]} /><Card title={`10月${day}日の予定`} variant="filled">{hasSchedule ? <ScheduleCarousel schedules={[{ id: '1', start: '09:00', end: '10:30', work: day === 4 ? '摘果・摘葉' : '灌水', workType: day === 4 ? 'thinning' : 'irrigate', place: '三番ハウス', members: ['確認ユーザー'] }]} /> : <AppText>予定はありません</AppText>}</Card><Button label="予定を入力" size="lg" onPress={() => router.push({ pathname: '../schedule/new', params: { day } })} /></PageLayout>;
}

const styles = StyleSheet.create({ month: { alignItems: 'center' }, week: { flexDirection: 'row' }, weekLabel: { flex: 1, textAlign: 'center' }, calendar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' } });
