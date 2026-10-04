import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { ScheduleRow, ScheduleRowItem } from './schedule-row';

export type ScheduleCarouselItem = ScheduleRowItem;
export type ScheduleCarouselProps = {
  schedules: readonly ScheduleCarouselItem[];
  emptyMessage?: string;
  addLabel?: string;
  onAdd?: () => void;
  onSchedulePress?: (id: string) => void;
  testID?: string;
};

export function ScheduleCarousel({ schedules, emptyMessage = '予定はありません', addLabel, onAdd, onSchedulePress, testID }: ScheduleCarouselProps) {
  const ordered = [...schedules].sort((a, b) => a.start.localeCompare(b.start));
  if (!ordered.length) return <View style={styles.empty} testID={testID}><AppText>{emptyMessage}</AppText></View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.carousel}
      contentContainerStyle={styles.content}
      testID={testID}>
      <ScheduleRow schedules={ordered} addLabel={addLabel} onAdd={onAdd} onSchedulePress={onSchedulePress} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  carousel: { flexGrow: 0, height: 123, width: '100%' },
  content: { paddingRight: 16 },
  empty: { alignItems: 'center', paddingVertical: 24 },
});
