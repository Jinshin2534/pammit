import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PageLayout } from '@/components/layout/page-layout';
import { ScreenHeader } from '@/components/navigation/screen-header';
import { CalendarDay, WorkTypeLegend } from '@/components/schedule';
import { AppText, Button, Card } from '@/components/ui';

export default function JournalsScreen() {
  const [day, setDay] = useState(4);
  const hasJournal = day === 4 || day === 6;
  return <PageLayout contentPadding={16} header={<ScreenHeader title="農園日誌" showBack onBack={() => router.back()} topPadding={16} />} testID="journal-calendar-screen"><AppText variant="bodyLgBold" style={{ textAlign: 'center' }}>2026年10月</AppText><View style={styles.calendar}>{Array.from({ length: 31 }, (_, index) => { const value = index + 1; return <CalendarDay key={value} day={value} selected={day === value} workTypes={value === 4 ? ['thinning', 'harvest'] : value === 6 ? ['irrigate'] : []} onPress={() => setDay(value)} />; })}</View><WorkTypeLegend items={[{ type: 'thinning', label: '摘果・摘葉' }, { type: 'harvest', label: '収穫' }, { type: 'irrigate', label: '灌水' }]} /><Card title={`10月${day}日`} body={hasJournal ? '作業記録があります' : '作業記録はありません'} variant={hasJournal ? 'filled' : 'muted'}>{hasJournal && <Button label="この日の日誌を見る" size="lg" onPress={() => router.push({ pathname: './journals/day', params: { day } })} />}</Card><Button label="期間を選んでPDF" size="lg" variant="secondary" onPress={() => router.push('./journals/pdf')} /></PageLayout>;
}
const styles = StyleSheet.create({ calendar: { flexDirection: 'row', flexWrap: 'wrap' } });
