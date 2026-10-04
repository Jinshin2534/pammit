import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { ScheduleCard, ScheduleCardProps } from './schedule-card';

export type ScheduleCarouselItem = ScheduleCardProps & { id: string };
export type ScheduleCarouselProps = { schedules: readonly ScheduleCarouselItem[]; emptyMessage?: string; onSchedulePress?: (id: string) => void; testID?: string };
export function ScheduleCarousel({ schedules, emptyMessage = '予定はありません', onSchedulePress, testID }: ScheduleCarouselProps) {
  const ordered = [...schedules].sort((a, b) => a.start.localeCompare(b.start));
  if (!ordered.length) return <View style={styles.empty} testID={testID}><AppText>{emptyMessage}</AppText></View>;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} testID={testID}>{ordered.map(({ id, ...schedule }) => <ScheduleCard key={id} {...schedule} onPress={onSchedulePress ? () => onSchedulePress(id) : schedule.onPress} />)}</ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: 3, paddingRight: 50 }, empty: { alignItems: 'center', paddingVertical: 24 } });
