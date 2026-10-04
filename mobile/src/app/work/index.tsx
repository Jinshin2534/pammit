import { router } from 'expo-router';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { ScheduleCarousel } from '@/components/schedule';
import { AppText, Button, Card } from '@/components/ui';

export default function WorkStartScreen() {
  return <PageLayout header={<ScreenHeader title="作業を始める" showBack onBack={() => router.back()} topPadding={16} />} testID="work-start-screen"><AppText variant="bodyLgBold">今日の予定から選ぶ</AppText><ScheduleCarousel schedules={[{ id: 'today-1', start: '09:00', end: '10:30', work: '摘果・摘葉', workType: 'thinning', place: '三番ハウス', members: ['確認ユーザー'] }]} onSchedulePress={() => router.push({ pathname: '/work/plot', params: { plot: '三番ハウス', work: '摘果・摘葉' } })} /><Card body="予定にない作業を始める場合はこちらから進んでください。" variant="filled"><Button label="新しく始める" size="lg" variant="primary" onPress={() => router.push('/work/plot')} /></Card></PageLayout>;
}
