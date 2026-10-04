import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MenuTile, MetricTile } from '@/components/dashboard';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { CalendarDay, ScheduleCarousel, WorkTypeLegend } from '@/components/schedule';
import { AppText } from '@/components/ui';

const legend = [
  { type: 'thinning', label: '摘果・摘葉' },
  { type: 'harvest', label: '収穫' },
  { type: 'irrigate', label: '灌水' },
] as const;

export default function ScheduleAndDashboardPreview() {
  const [selectedDay, setSelectedDay] = useState(4);
  const [message, setMessage] = useState('');
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <PageLayout header={<ScreenHeader title="予定・農園の部品" topPadding={16} />} testID="schedule-dashboard-preview">
      <View style={styles.tiles}>
        <MetricTile label="土壌水分" value="35" unit="%" detail="前日より +2%" testID="preview-metric" />
        <MetricTile label="明日の気温" value="28" unit="℃" detail="晴れ" />
      </View>
      <View style={styles.tiles}>
        <MenuTile title="農園日誌" description="作業記録を見る" icon={<AppText variant="title">本</AppText>} onPress={() => setMessage('農園日誌を押しました')} testID="preview-menu" />
        <MenuTile title="作業者登録" description="人を追加する" icon={<AppText variant="title">人</AppText>} onPress={() => setMessage('作業者登録を押しました')} />
      </View>

      <AppText variant="bodyLgBold">CalendarDay（＋円グラフ、点線は SVG）</AppText>
      <View style={styles.calendar}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => <CalendarDay key={day} day={day} workTypes={day === 4 ? ['thinning', 'harvest', 'irrigate'] : day === 6 ? ['harvest'] : []} selected={selectedDay === day} isSunday={day === 1} isSaturday={day === 7} onPress={() => setSelectedDay(day)} testID={`preview-day-${day}`} />)}
      </View>
      <WorkTypeLegend items={legend} testID="preview-legend" />

      <AppText variant="bodyLgBold">ScheduleCard・ScheduleCarousel（横スクロール）</AppText>
      <ScheduleCarousel
        schedules={[
          { id: '1', start: '09:00', end: '10:30', work: '摘果・摘葉', workType: 'thinning', place: '三番ハウス', members: ['山田さん', '佐藤さん'], note: '入口側から開始' },
          { id: '2', start: '13:00', end: '14:00', work: '収穫', workType: 'harvest', place: '一番ハウス', members: ['鈴木さん', '田中さん', '高橋さん', '伊藤さん', '渡辺さん', '小林さん'] },
          { id: '3', start: '15:00', end: '15:30', work: '灌水', workType: 'irrigate', place: '二番ハウス', members: [] },
        ]}
        onSchedulePress={(id) => setMessage(`予定${id}を押しました`)}
        testID="preview-carousel"
      />
      <AppText>確認結果：{message || `${selectedDay}日を選択中`}</AppText>
    </PageLayout>
  );
}

const styles = StyleSheet.create({ tiles: { flexDirection: 'row', gap: 12 }, calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center' } });
