import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, strokes } from '@/theme/tokens';
import { WorkTypeKey } from './work-type-legend';

export type ScheduleCardLayout = 'compact' | 'wide';
export type ScheduleCardAppearance = 'filled' | 'outlined';

export type ScheduleCardProps = {
  start: string;
  end: string;
  work: string;
  workType: WorkTypeKey;
  place: string;
  members: readonly string[];
  note?: string;
  layout?: ScheduleCardLayout;
  appearance?: ScheduleCardAppearance;
  onPress?: () => void;
  testID?: string;
};

export function ScheduleCard({ start, end, work, place, members, layout = 'compact', appearance = 'filled', onPress, testID }: ScheduleCardProps) {
  const shown = members.slice(0, 5);
  const extra = Math.max(0, members.length - shown.length);
  const outlined = appearance === 'outlined';
  const memberText = `${shown.join('・') || '未指定'}${extra > 0 ? `・ほか${extra}名` : ''}`;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        layout === 'wide' ? styles.wide : styles.compact,
        outlined && styles.outlined,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.inner, layout === 'wide' && styles.wideInner]}>
        <View style={styles.time}>
          <AppText>{start}</AppText>
          <View style={styles.line} />
          <AppText>{end}</AppText>
        </View>
        <View style={styles.content}>
          <AppText variant="bodyLg" numberOfLines={1} style={[styles.work, outlined && styles.outlinedWork]}>{work}</AppText>
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <AppText variant="small">場所</AppText>
              <AppText variant="caption" numberOfLines={1}>{place}</AppText>
            </View>
            <View style={styles.detailRow}>
              <AppText variant="small">担当</AppText>
              <AppText variant="caption" numberOfLines={1} style={styles.member}>{memberText}</AppText>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'flex-start', backgroundColor: colors.primary, borderRadius: radii.md, flexShrink: 0, paddingBottom: 10, paddingHorizontal: 11, paddingTop: 8 },
  compact: { height: 123, width: 181 },
  wide: { height: 123, width: 284 },
  outlined: { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: strokes.default, height: 131 },
  inner: { gap: 12, width: 159 },
  wideInner: { width: 254 },
  time: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  line: { backgroundColor: colors.text, height: 1, width: 40 },
  work: { color: colors.textInverse },
  outlinedWork: { color: colors.text },
  content: { gap: 12, width: '100%' },
  details: { gap: 3 },
  detailRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 13, overflow: 'hidden' },
  member: { flexShrink: 1, maxWidth: 78 },
  pressed: { opacity: 0.7 },
});
