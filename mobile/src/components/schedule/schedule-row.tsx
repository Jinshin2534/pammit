import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { ScheduleCard, ScheduleCardProps } from './schedule-card';

export type ScheduleRowItem = ScheduleCardProps & { id: string };
export type ScheduleRowProps = {
  schedules: readonly ScheduleRowItem[];
  addLabel?: string;
  onAdd?: () => void;
  onSchedulePress?: (id: string) => void;
  testID?: string;
};

export function ScheduleRow({ schedules, addLabel = '＋予定の追加', onAdd, onSchedulePress, testID }: ScheduleRowProps) {
  return (
    <View style={styles.row} testID={testID}>
      {schedules.map(({ id, ...schedule }) => (
        <ScheduleCard
          key={id}
          {...schedule}
          layout="compact"
          appearance="filled"
          onPress={onSchedulePress ? () => onSchedulePress(id) : schedule.onPress}
        />
      ))}
      {onAdd ? (
        <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [styles.addCard, pressed && styles.pressed]}>
          <AppText variant="bodyLg" numberOfLines={1} style={styles.addLabel}>{addLabel}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  addCard: { alignItems: 'center', flexShrink: 0, height: 123, justifyContent: 'center', width: 181 },
  addLabel: { color: colors.textSub, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
